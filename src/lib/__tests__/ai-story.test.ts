import { describe, expect, it } from "vitest";
import { newSrsState } from "../migrate";
import {
  alignTranslations,
  buildSentenceQuiz,
  cleanStory,
  firstSentence,
  isCleanStory,
  isMetaSentence,
  MIN_STORY_SENTENCES,
  pickStoryWords,
  storyPrompt,
  storySentences,
  wordsInStory,
  writeStory,
  type ChatMessage,
  type Generate,
  type StoryWord,
} from "../ai-story";
import type { Flashcard } from "../store";

const card = (id: string, front: string): Flashcard => ({
  id,
  front,
  back: `${front}-fr`,
  src: "en",
  tgt: "fr",
  srs: newSrsState(id, 0),
  createdAt: 0,
  status: "learn",
});

describe("pickStoryWords", () => {
  it("picks 12 distinct random words, or all of them when there are fewer", () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`w${i}`, `word${i}`));
    const picked = pickStoryWords(cards);
    expect(picked).toHaveLength(12);
    expect(new Set(picked.map((w) => w.word)).size).toBe(12);
    expect(pickStoryWords(cards.slice(0, 5))).toHaveLength(5);
    expect(pickStoryWords([card("a", "Cat"), card("b", "cat")])).toHaveLength(1);
  });
  it("is random but follows the random source", () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`w${i}`, `word${i}`));
    const seq = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    expect(pickStoryWords(cards, 12, seq(1))).toEqual(pickStoryWords(cards, 12, seq(1)));
    expect(pickStoryWords(cards, 12, seq(1))).not.toEqual(pickStoryWords(cards, 12, seq(2)));
  });
  it("skips cards without an English word", () => {
    const fr = { ...card("x", "chat"), src: "fr", tgt: "ar" } as Flashcard;
    expect(pickStoryWords([fr, card("a", "cat")]).map((w) => w.id)).toEqual(["a"]);
  });
});

describe("storyPrompt", () => {
  it("asks for a titled story using every word", () => {
    const [system, user] = storyPrompt(["apple", "thank you"]);
    expect(system.role).toBe("system");
    expect(user.content).toContain("apple");
    expect(user.content).toContain("thank you");
    expect(user.content).toMatch(/Title:/);
  });
});

const STORY =
  "Title: A Day at the Market\n\nTom goes to the market. He buys an apple. It is red.\n\n" +
  "He sees his friend Ana. She says hello. They walk home.\n\nAt home, Tom eats the apple. It is sweet. " +
  "He is happy.";

describe("cleanStory", () => {
  it("reads a titled story", () => {
    expect(cleanStory(STORY)).toEqual({
      title: "A Day at the Market",
      paragraphs: [
        "Tom goes to the market. He buys an apple. It is red.",
        "He sees his friend Ana. She says hello. They walk home.",
        "At home, Tom eats the apple. It is sweet. He is happy.",
      ],
    });
  });
  it("drops chat lines, markdown, think blocks and word lists around the story", () => {
    const reply =
      "<think>\nok\n</think>\nSure! Here is your story:\n\n**Title: A Day at the Market**\n\n" +
      STORY.split("\n\n").slice(1).join("\n\n") +
      "\n\nWords used: apple, market, friend\n- apple\n- market";
    expect(cleanStory(reply)?.title).toBe("A Day at the Market");
    expect(cleanStory(reply)?.paragraphs).toHaveLength(3);
    expect(cleanStory(reply)?.paragraphs.join(" ")).not.toMatch(/Words used|Sure|\*\*/);
  });
  it("gives a story without a title line a title from its first words", () => {
    expect(cleanStory(STORY.replace("Title: A Day at the Market\n\n", ""))?.title).toBeTruthy();
  });
  it("rejects replies that are not a story", () => {
    expect(cleanStory("Sure! What kind of story would you like?")).toBeNull();
    expect(cleanStory("- apple\n- market\n- friend\n- hello\n- home\n- red\n- sweet\n- happy")).toBeNull();
    expect(
      cleanStory(
        "Il était une fois un garçon. Il va au marché. Il achète une pomme. Elle est rouge. " +
          "Il voit son amie. Elle dit bonjour. Ils rentrent. Il mange la pomme.",
      ),
    ).toBeNull();
    expect(cleanStory("")).toBeNull();
  });
});

describe("storySentences / isCleanStory", () => {
  it("splits each paragraph into sentences", () => {
    expect(storySentences(cleanStory(STORY)!)[0]).toEqual(["Tom goes to the market.", "He buys an apple.", "It is red."]);
  });
  it("rejects a story with an unsuitable word in any sentence or the title", () => {
    const s = cleanStory(STORY)!;
    expect(isCleanStory(s)).toBe(true);
    expect(isCleanStory({ ...s, paragraphs: [...s.paragraphs, "Then he saw a gun."] })).toBe(false);
    expect(isCleanStory({ ...s, title: "The killer" })).toBe(false);
  });
});

describe("wordsInStory", () => {
  it("counts other forms of a word as used", () => {
    const words = [
      { id: "1", word: "go" },
      { id: "2", word: "child" },
      { id: "3", word: "thank you" },
      { id: "4", word: "zebra" },
    ];
    const story = { title: "Thank you", paragraphs: ["The children went home.", "She goes there."] };
    const { used, missed } = wordsInStory(story, words);
    expect(used.map((w) => w.id).sort()).toEqual(["1", "2", "3"]);
    expect(missed.map((w) => w.id)).toEqual(["4"]);
  });
});

describe("alignTranslations", () => {
  it("pairs one translated line per sentence, or gives up", () => {
    expect(alignTranslations(["A.", "B."], "Un.\nDeux.")).toEqual(["Un.", "Deux."]);
    expect(alignTranslations(["A.", "B."], " Un. \n\n Deux. ")).toEqual(["Un.", "Deux."]);
    expect(alignTranslations(["A.", "B."], "Un. Deux.")).toBeNull();
    expect(alignTranslations(["A.", "B."], "Un.\n\n")).toBeNull();
  });
});

describe("buildSentenceQuiz", () => {
  it("asks up to 8 sentences with 4 distinct choices from the same story", () => {
    const en = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} is here.`);
    const fr = en.map((_, i) => `Phrase numéro ${i} ici.`);
    const quiz = buildSentenceQuiz(en, fr);
    expect(quiz).toHaveLength(8);
    for (const q of quiz) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices).toContain(q.answer);
      expect(fr[en.indexOf(q.sentence)]).toBe(q.answer);
      expect(q.choices.every((c) => fr.includes(c))).toBe(true);
    }
    const idx = quiz.map((q) => en.indexOf(q.sentence));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
  it("never asks with fewer than 4 different choices", () => {
    expect(buildSentenceQuiz(["A b c.", "D e f.", "G h i."], ["Un.", "Deux.", "Trois."])).toEqual([]);
    const quiz = buildSentenceQuiz(
      ["One two three.", "Four five six.", "Seven eight nine.", "Ten eleven twelve.", "More words here."],
      ["Pareil.", "pareil", "Trois.", "Quatre.", "Cinq."],
    );
    for (const q of quiz) expect(new Set(q.choices.map((c) => c.toLowerCase().replace(/\W/g, ""))).size).toBe(4);
  });
});

describe("isMetaSentence", () => {
  it("flags talk about the task, blanks and empty text", () => {
    expect(isMetaSentence("I can't help with that sentence.")).toBe(true);
    expect(isMetaSentence("I cannot do this.")).toBe(true);
    expect(isMetaSentence("I'm sorry, but no.")).toBe(true);
    expect(isMetaSentence("As an AI, I write stories.")).toBe(true);
    expect(isMetaSentence("Here is the next one.")).toBe(true);
    expect(isMetaSentence("Here's a sentence")).toBe(true);
    expect(isMetaSentence("The story so far is fun.")).toBe(true);
    expect(isMetaSentence("The cat is __1__.")).toBe(true);
    expect(isMetaSentence("   ")).toBe(true);
  });
  it("lets a normal story sentence through", () => {
    expect(isMetaSentence("Tom goes to the market.")).toBe(false);
  });
});

describe("firstSentence", () => {
  it("drops think blocks, markdown and quotes", () => {
    expect(firstSentence("<think>hmm</think>\n**\"Tom goes home.\"** He is happy.")).toBe("Tom goes home.");
    expect(firstSentence("<think>never closed")).toBe("");
    expect(firstSentence("# _Tom_ runs.\nSecond line.")).toBe("Tom runs.");
    expect(firstSentence("“Hello there.” Next one.")).toBe("Hello there.");
    expect(firstSentence("")).toBe("");
  });
  it("keeps the blank of a fill-in sentence so it can be flagged", () => {
    // Underscores are stripped as markdown, so "__1__" leaves a stray digit, not a clean sentence.
    expect(firstSentence("The cat is __1__.")).toBe("The cat is 1.");
  });
});

describe("writeStory", () => {
  const wordOf = (m: ChatMessage[]) => /must use the word "([^"]+)"/.exec(m[1].content)?.[1] ?? null;
  const isTitle = (m: ChatMessage[]) => m[0].content === "Reply with the title only.";
  const words = (...w: string[]): StoryWord[] => w.map((word, i) => ({ id: `id${i}`, word }));
  const GOOD: Record<string, string> = {
    apple: "Tom eats an apple.",
    market: "He goes to the market.",
    friend: "He sees a friend there.",
    red: "The hat is red.",
    sweet: "The cake is sweet.",
    happy: "He is happy now.",
    home: "Then he walks home.",
    dog: "A small dog runs by.",
    tree: "The tree is very tall.",
    sun: "The sun is warm today.",
    river: "They see the river.",
    bird: "A bird sings in the sky.",
  };
  const PAD = "It is a good day.";
  const run = async (w: StoryWord[], reply: (m: ChatMessage[], n: number) => string | null) => {
    const calls: ChatMessage[][] = [];
    const gen: Generate = async (m, n) => {
      calls.push(m);
      return reply(m, n);
    };
    const progress: [number, number][] = [];
    const text = await writeStory(w, gen, (d, t) => progress.push([d, t]));
    return { text, calls, progress };
  };
  const twelve = Object.keys(GOOD);

  it("uses each word's sentence when it contains the word", async () => {
    const w = words(...twelve);
    const { text, calls } = await run(w, (m) => (isTitle(m) ? "Tom at the Market" : GOOD[wordOf(m)!]));
    expect(calls).toHaveLength(13);
    const story = cleanStory(text!)!;
    expect(story).not.toBeNull();
    expect(story.title).toBe("Tom at the Market");
    expect(wordsInStory(story, w).used).toHaveLength(12);
    expect(storySentences(story).flat()).toEqual(twelve.map((k) => GOOD[k]));
  });

  it("retries once when the first reply lacks the word, and accepts a clean second reply", async () => {
    const w = words("apple", ...twelve.slice(1));
    let apple = 0;
    const { text, calls } = await run(w, (m) => {
      if (isTitle(m)) return "Tom at the Market";
      if (wordOf(m) === "apple") return apple++ === 0 ? "I can't help with that sentence." : "The sun is up.";
      return GOOD[wordOf(m)!];
    });
    expect(apple).toBe(2);
    expect(calls).toHaveLength(14);
    expect(text).toContain("The sun is up.");
    // Same when the first reply is clean but misses the word.
    let n = 0;
    const r2 = await run(words("apple", ...twelve.slice(1)), (m) => {
      if (isTitle(m)) return "Tom at the Market";
      if (wordOf(m) === "apple") return n++ === 0 ? "The sky is blue." : "The sun is up.";
      return GOOD[wordOf(m)!];
    });
    expect(r2.text).toContain("The sun is up.");
    expect(r2.text).not.toContain("The sky is blue.");
  });

  it("skips a word when both replies are meta or unclean", async () => {
    const w = words(...twelve);
    const { text, progress } = await run(w, (m) => {
      if (isTitle(m)) return "Tom at the Market";
      const word = wordOf(m);
      if (word === "apple") return "I can't help with that sentence.";
      if (word === "dog") return "Then he saw a gun."; // unclean on both tries
      return word ? GOOD[word] : PAD;
    });
    const story = cleanStory(text!)!;
    expect(storySentences(story).flat()).toHaveLength(10);
    expect(text).not.toMatch(/gun|can't/);
    expect(progress.at(-1)).toEqual([10, 12]);
  });

  it("pads with word-less sentences up to the minimum when given few words", async () => {
    const w = words("apple", "market", "friend");
    const { text, progress } = await run(w, (m) => {
      if (isTitle(m)) return "Tom at the Market";
      const word = wordOf(m);
      return word ? GOOD[word] : PAD;
    });
    expect(storySentences(cleanStory(text!)!).flat()).toHaveLength(MIN_STORY_SENTENCES);
    expect(progress).toHaveLength(MIN_STORY_SENTENCES);
    expect(progress.at(-1)).toEqual([8, 8]);
    expect(progress[0]).toEqual([1, 8]);
  });

  it("reports total = number of words when there are more than 8", async () => {
    const { progress } = await run(words(...twelve), (m) => (isTitle(m) ? "Tom at the Market" : GOOD[wordOf(m)!]));
    expect(progress[0]).toEqual([1, 12]);
    expect(progress.at(-1)).toEqual([12, 12]);
  });

  it("stops padding after repeated failures", async () => {
    const { text } = await run(words("apple"), (m) => {
      if (isTitle(m)) return "Tom at the Market";
      const word = wordOf(m);
      return word ? GOOD[word] : "I can't help with that sentence.";
    });
    expect(text).toContain("Tom eats an apple.");
    expect(cleanStory(text!)).toBeNull();
  });

  it("falls back to the first 4 words of the story for a meta, long or story-word title", async () => {
    const w = words(...twelve);
    for (const title of ["I can't write a title.", "A very long title for this little tale", "The Story of Tom", "Title: The Story"]) {
      const { text } = await run(w, (m) => (isTitle(m) ? title : GOOD[wordOf(m)!]));
      expect(text!.split("\n")[0]).toBe("Title: Tom eats an apple");
    }
  });

  it("strips a Title: prefix and final dot from a good title", async () => {
    const { text } = await run(words(...twelve), (m) => (isTitle(m) ? "Title: Tom's Day." : GOOD[wordOf(m)!]));
    expect(text!.split("\n")[0]).toBe("Title: Tom's Day");
  });

  it("returns null as soon as generate returns null", async () => {
    let calls = 0;
    const gen: Generate = async () => (++calls === 3 ? null : "Tom eats an apple.");
    expect(await writeStory(words(...twelve), gen)).toBeNull();
    expect(calls).toBe(3);
    // Also on the title call.
    const gen2: Generate = async (m) => (isTitle(m) ? null : GOOD[wordOf(m)!]);
    expect(await writeStory(words(...twelve), gen2)).toBeNull();
  });

  it("gives a result that passes cleanStory and has up to 3 paragraphs", async () => {
    const { text } = await run(words(...twelve), (m) => (isTitle(m) ? "Tom at the Market" : GOOD[wordOf(m)!]));
    const story = cleanStory(text!)!;
    expect(story.paragraphs).toHaveLength(3);
    expect(isCleanStory(story)).toBe(true);
  });

  it("passes the story so far to each next sentence", async () => {
    const { calls } = await run(words(...twelve), (m) => (isTitle(m) ? "Tom at the Market" : GOOD[wordOf(m)!]));
    expect(calls[0][1].content).toContain("first sentence");
    expect(calls[1][1].content).toContain("Tom eats an apple.");
  });
});
