import { AI_LIMITS, AiError, type StoryResponse, type StorySentence } from "./ai-api";
import type { Flashcard } from "./store";
import { englishWord, highlightWords } from "./story";
import { isCleanSentence } from "./word/clean";
import { choicesFor } from "./quiz";

// Logic around the AI story: which words to ask for, reading the server's reply, and the
// sentence quiz. The story itself is written on the server (POST /api/ai/, see ai-api.ts).

export const AI_STORY_WORDS = 12;
export const MIN_AI_WORDS = 4;
export const MAX_STORY_QUIZ = 8;
/** The story's sentences are shown in up to this many paragraphs. */
const PARAGRAPHS = 3;

export type StoryWord = { id: string; word: string };

// What the server accepts as a story word: letters, spaces, hyphens and apostrophes.
const STORY_WORD = /^[\p{L}\p{M}' ’-]+$/u;

/** True when the server would accept the word for a story; other words are left out instead of failing the request. */
export function isStoryWord(word: string): boolean {
  return word.length <= AI_LIMITS.maxWordLength && STORY_WORD.test(word) && /\p{L}/u.test(word);
}

/** The distinct English words of the cards that a story can be written with, in card order. */
export function storyWords(cards: Flashcard[]): StoryWord[] {
  const seen = new Set<string>();
  const words: StoryWord[] = [];
  for (const c of cards) {
    const word = englishWord(c);
    const key = word?.toLowerCase();
    if (!word || !key || seen.has(key) || !isStoryWord(word)) continue;
    seen.add(key);
    words.push({ id: c.id, word });
  }
  return words;
}

/** Up to `n` distinct English words from the cards, picked at random (all of them when there are fewer). */
export function pickStoryWords(cards: Flashcard[], n = AI_STORY_WORDS, random: () => number = Math.random): StoryWord[] {
  const words = storyWords(cards);
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.slice(0, Math.min(n, AI_LIMITS.maxStoryWords));
}

/** A story ready to show: its title and its sentences (with their translations) in paragraphs. */
export type AiStoryText = { title: string; paragraphs: StorySentence[][] };

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * The server's story in paragraphs, or null when it has no usable sentence or fails the
 * sentence filter. The server filters too; this is a second check, and it guards against a
 * reply of the wrong shape.
 */
export function readStory(reply: StoryResponse): AiStoryText | null {
  if (!reply || typeof reply.title !== "string" || !Array.isArray(reply.sentences)) return null;
  const sentences = reply.sentences
    .filter((s) => s && typeof s.en === "string" && typeof s.tr === "string")
    .map((s) => ({ en: s.en.trim(), tr: s.tr.trim() }))
    .filter((s) => s.en && s.tr);
  if (!sentences.length) return null;
  const title =
    reply.title.trim() ||
    sentences[0].en.split(/\s+/).slice(0, 4).join(" ").replace(/[.,;:!?]+$/, "");
  // English only: the filter's French list has words that are harmless in a translation.
  if (!isCleanSentence(title) || !sentences.every((s) => isCleanSentence(s.en))) return null;
  const per = Math.ceil(sentences.length / PARAGRAPHS);
  const paragraphs: StorySentence[][] = [];
  for (let i = 0; i < sentences.length; i += per) paragraphs.push(sentences.slice(i, i + per));
  return { title, paragraphs };
}

/** Which of the words the story uses (in any form) and which it leaves out. */
export function wordsInStory(story: AiStoryText, words: StoryWord[]): { used: StoryWord[]; missed: StoryWord[] } {
  const ids = new Set<string>();
  for (const text of [story.title, ...story.paragraphs.map((p) => p.map((s) => s.en).join(" "))]) {
    for (const part of highlightWords(text, words)) if (part.cardId) ids.add(part.cardId);
  }
  return { used: words.filter((w) => ids.has(w.id)), missed: words.filter((w) => !ids.has(w.id)) };
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

/** The quiz on a story's sentences and their translations. */
export function storyQuiz(story: AiStoryText, max = MAX_STORY_QUIZ): SentenceQuestion[] {
  const sentences = story.paragraphs.flat();
  return buildSentenceQuiz(
    sentences.map((s) => s.en),
    sentences.map((s) => s.tr),
    max,
  );
}

/** What went wrong, as the story screen says it. `minutes` comes with "busyMinutes". */
export type StoryProblem =
  | { key: "offline" | "busy" | "busyLater" | "unsafe" | "unavailable" }
  | { key: "busyMinutes"; minutes: number };

/** The message for a failed story request. A wait over an hour means the day's free allowance is used up. */
export function storyProblem(error: unknown): StoryProblem {
  if (!(error instanceof AiError)) return { key: "unavailable" };
  switch (error.code) {
    case "offline":
      return { key: "offline" };
    case "unsafe":
      return { key: "unsafe" };
    case "busy": {
      const wait = error.retryAfter;
      if (wait === undefined || wait <= 60) return { key: "busy" };
      if (wait > 3600) return { key: "busyLater" };
      return { key: "busyMinutes", minutes: Math.ceil(wait / 60) };
    }
    default:
      return { key: "unavailable" };
  }
}
