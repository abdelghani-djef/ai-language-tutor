import type { Flashcard } from "./store";
import { englishWord, highlightWords } from "./story";
import { isCleanSentence } from "./word/clean";
import { choicesFor } from "./quiz";

// Logic around the AI story: which words to ask for, the prompt, reading the model's reply,
// and the sentence quiz. The model itself runs in a worker (see the AI story design).

export const AI_STORY_WORDS = 12;
export const MIN_AI_WORDS = 4;
export const MAX_STORY_QUIZ = 8;

export type StoryWord = { id: string; word: string };

/** Up to `n` distinct English words from the cards, picked at random (all of them when there are fewer). */
export function pickStoryWords(cards: Flashcard[], n = AI_STORY_WORDS, random: () => number = Math.random): StoryWord[] {
  const seen = new Set<string>();
  const words: StoryWord[] = [];
  for (const c of cards) {
    const word = englishWord(c);
    const key = word?.toLowerCase();
    if (!word || !key || seen.has(key)) continue;
    seen.add(key);
    words.push({ id: c.id, word });
  }
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.slice(0, n);
}

export type ChatMessage = { role: "system" | "user"; content: string };

export function storyPrompt(words: string[]): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You write short, simple stories in easy English (level A2) for language learners. " +
        "The stories are friendly and suitable for children. Reply with the story only.",
    },
    {
      role: "user",
      content:
        "Write a story of 8 to 14 short sentences (about 120 to 200 words) in 2 to 4 paragraphs that uses every one of " +
        `these words: ${words.join(", ")}. ` +
        "Write the first line as Title: <title>, then a blank line, then the story. " +
        "No lists, no notes, no questions.",
    },
  ];
}

export type AiStoryText = { title: string; paragraphs: string[] };

// Common English words; a real English story is full of them, French or Spanish text has almost none.
const ENGLISH_WORDS = new Set(
  ("the and to he she it they is are was were his her their of in at with for that this then but not " +
    "have has had be been an you i we my your our him them there when what")
    .split(" "),
);

const LIST_ITEM = /^([-*•]\s|\d+[.)]\s)/;
const CHAT_LINE = /^(sure|here is|here's|here are|okay|ok|of course)\b/i;
const NOTES_LINE = /^(words used|notes?|vocabulary)\b/i;

const unquote = (s: string) => s.replace(/^["“”]+(.*?)["“”]+$/, "$1").trim();
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** The story in a model reply, or null when the reply is not an English story of enough sentences. */
export function cleanStory(reply: string): AiStoryText | null {
  const text = reply
    .replace(/^[\s\S]*<\/think>/i, "")
    .replace(/<think>[\s\S]*$/i, "");
  const raw = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = raw.filter(Boolean);
  if (!nonEmpty.length) return null;
  if (nonEmpty.filter((l) => LIST_ITEM.test(l)).length > nonEmpty.length / 3) return null;

  // Stop at a trailing notes or word-list section.
  let end = raw.length;
  let prevList = false;
  for (let i = 0; i < raw.length; i++) {
    if (!raw[i]) continue;
    const list = LIST_ITEM.test(raw[i]);
    if (NOTES_LINE.test(raw[i].replace(/[*_#]/g, "").trim()) || (list && prevList)) {
      end = i - (list && prevList ? 1 : 0);
      break;
    }
    prevList = list;
  }
  let lines = raw.slice(0, Math.max(end, 0)).map((l) => unquote(l.replace(/[*_#]/g, "").trim()));

  let title = "";
  const titleAt = lines.findIndex((l) => /^title\s*:/i.test(l));
  if (titleAt >= 0) {
    title = unquote(lines[titleAt].replace(/^title\s*:/i, "").trim());
    lines = lines.slice(titleAt + 1);
    if (!title) {
      const next = lines.findIndex(Boolean);
      if (next >= 0) {
        title = lines[next];
        lines = lines.slice(next + 1);
      }
    }
  } else {
    while (lines.length && (!lines[0] || CHAT_LINE.test(lines[0]) || lines[0].endsWith(":"))) lines.shift();
    const first = lines[0] ?? "";
    if (first && wordCount(first) <= 8 && !first.endsWith(".") && lines.slice(1).some(Boolean)) {
      title = first;
      lines = lines.slice(1);
    }
  }

  const paragraphs: string[] = [];
  let block: string[] = [];
  for (const l of [...lines, ""]) {
    if (l) block.push(l);
    else if (block.length) {
      paragraphs.push(block.join(" ").replace(/\s+/g, " "));
      block = [];
    }
  }
  if (!paragraphs.length) return null;
  if (!title) title = paragraphs[0].split(/\s+/).slice(0, 4).join(" ").replace(/[.,;:!?]+$/, "");
  const story = { title, paragraphs };

  if (storySentences(story).flat().length < 8) return null;
  const body = paragraphs.join(" ");
  const letters = body.match(/\p{L}/gu) ?? [];
  if (!letters.length || letters.filter((c) => /[a-z]/i.test(c)).length / letters.length < 0.9) return null;
  const words = body.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.filter((w) => ENGLISH_WORDS.has(w)).length < words.length * 0.2) return null;
  return story;
}

const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

/** The sentences of each paragraph. */
export function storySentences(story: AiStoryText): string[][] {
  return story.paragraphs.map((p) =>
    [...segmenter.segment(p)].map((s) => s.segment.trim()).filter(Boolean),
  );
}

/** True when the title and every sentence pass the sentence filter. */
export function isCleanStory(story: AiStoryText): boolean {
  return isCleanSentence(story.title) && storySentences(story).flat().every(isCleanSentence);
}

/** Which of the words the story uses (in any form) and which it leaves out. */
export function wordsInStory(story: AiStoryText, words: StoryWord[]): { used: StoryWord[]; missed: StoryWord[] } {
  const ids = new Set<string>();
  for (const text of [story.title, ...story.paragraphs]) {
    for (const part of highlightWords(text, words)) if (part.cardId) ids.add(part.cardId);
  }
  return { used: words.filter((w) => ids.has(w.id)), missed: words.filter((w) => !ids.has(w.id)) };
}

/** The translated lines, one per sentence, or null when the count does not match. */
export function alignTranslations(sentences: string[], translated: string): string[] | null {
  const lines = translated.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length === sentences.length ? lines : null;
}

export type SentenceQuestion = { sentence: string; answer: string; choices: string[] };

/** Up to `max` questions in story order: an English sentence and 4 translations, 3 taken from the same story. */
export function buildSentenceQuiz(sentences: string[], translations: string[], max = MAX_STORY_QUIZ): SentenceQuestion[] {
  const pickFrom = (indexes: number[]) => {
    const a = [...indexes];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const all = sentences.map((_, i) => i).filter((i) => translations[i] !== undefined);
  const good = all.filter((i) => {
    const n = wordCount(sentences[i]);
    return n >= 4 && n <= 25;
  });
  let order = pickFrom(good);
  if (order.length < max) order = [...order, ...pickFrom(all.filter((i) => !good.includes(i)))];
  const questions: SentenceQuestion[] = [];
  for (const i of order.slice(0, max).sort((a, b) => a - b)) {
    const answer = translations[i];
    const choices = choicesFor(answer, translations.filter((_, j) => j !== i));
    if (choices.length === 4) questions.push({ sentence: sentences[i], answer, choices });
  }
  return questions.length >= 4 ? questions : [];
}

// Writing the story one sentence per word: the model sees the story so far and writes the next sentence.

/** Runs the model on a chat; null means the learner cancelled. */
export type Generate = (messages: ChatMessage[], maxNewTokens: number) => Promise<string | null>;

export const SENTENCE_TOKENS = 48;
export const TITLE_TOKENS = 16;
export const MIN_STORY_SENTENCES = 8;

const STEP_SYSTEM: ChatMessage = {
  role: "system",
  content:
    "You write short, simple stories in easy English (level A2) for language learners. " +
    "The stories are friendly and suitable for children. Reply with the sentence only.",
};

/** The chat that asks for the next sentence; `word` is null for a padding sentence that needs no word. */
export function sentencePrompt(storySoFar: string[], word: string | null): ChatMessage[] {
  const useWord = word === null ? "" : ` It must use the word "${word}".`;
  const content = storySoFar.length
    ? `Here is the story so far:\n${storySoFar.join(" ")}\n\nWrite the next sentence of this story.${useWord} One short, simple sentence that continues the story.`
    : `Write the first sentence of a short, simple story for children.${useWord} One short sentence.`;
  return [STEP_SYSTEM, { role: "user", content }];
}

export function titlePrompt(sentences: string[]): ChatMessage[] {
  return [
    { role: "system", content: "Reply with the title only." },
    { role: "user", content: `Give this story a short title of 2 to 5 words:\n${sentences.join(" ")}` },
  ];
}

/** The first sentence of a model reply, without thinking text, markdown marks and quotes. */
export function firstSentence(reply: string): string {
  const text = reply
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*<\/think>/i, "")
    .replace(/<think>[\s\S]*$/i, "")
    .replace(/[*_#"“”]/g, "")
    .trim();
  const line = text.split(/\r?\n/)[0] ?? "";
  const first = [...segmenter.segment(line)][0];
  return (first?.segment ?? line).trim();
}

const META =
  /i can['’]?t\b|i cannot|i['’]?m sorry|as an ai|sentence|the word|your request|here is|here['’]s|story so far|_{2,}/i;

/** True when the sentence talks about the task instead of the story. */
export function isMetaSentence(sentence: string): boolean {
  return !sentence.trim() || META.test(sentence);
}

/** The story as `Title: <title>` and paragraphs, or null when the learner cancelled. */
export async function writeStory(
  words: StoryWord[],
  generate: Generate,
  onSentence?: (done: number, total: number) => void,
): Promise<string | null> {
  const done: string[] = [];
  const target = Math.max(words.length, MIN_STORY_SENTENCES);
  const usable = (s: string) => !isMetaSentence(s) && isCleanSentence(s);
  const hasWord = (s: string, w: StoryWord) => wordsInStory({ title: "", paragraphs: [s] }, [w]).used.length > 0;

  // One sentence for the word (or a padding sentence for null): the first try must use the word, the second need not.
  // Returns null when cancelled, the sentence, or "" when both tries failed.
  const write = async (w: StoryWord | null): Promise<string | null> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const reply = await generate(sentencePrompt(done, w?.word ?? null), SENTENCE_TOKENS);
      if (reply === null) return null;
      const s = firstSentence(reply);
      if (usable(s) && (!w || attempt === 1 || hasWord(s, w))) return s;
    }
    return "";
  };

  for (const w of words) {
    const s = await write(w);
    if (s === null) return null;
    if (s) {
      done.push(s);
      onSentence?.(done.length, target);
    }
  }
  let failed = 0;
  while (done.length < MIN_STORY_SENTENCES && failed < 4) {
    const s = await write(null);
    if (s === null) return null;
    if (s) {
      failed = 0;
      done.push(s);
      onSentence?.(done.length, target);
    } else failed += 2;
  }

  const reply = await generate(titlePrompt(done), TITLE_TOKENS);
  if (reply === null) return null;
  let title = firstSentence(reply).replace(/^title\s*:\s*/i, "").replace(/\.$/, "").trim();
  if (wordCount(title) > 6 || /story|title/i.test(title) || !usable(title)) {
    title = done.join(" ").split(/\s+/).slice(0, 4).join(" ").replace(/[.,;:!?]+$/, "");
  }

  const per = Math.ceil(done.length / 3);
  const paragraphs = [0, 1, 2].map((i) => done.slice(i * per, (i + 1) * per).join(" ")).filter(Boolean);
  return `Title: ${title}\n\n${paragraphs.join("\n\n")}`;
}
