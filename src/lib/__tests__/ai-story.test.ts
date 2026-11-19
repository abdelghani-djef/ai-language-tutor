import { describe, expect, it } from "vitest";
import { AiError } from "../ai-api";
import {
  buildSentenceQuiz,
  isStoryWord,
  pickStoryWords,
  readStory,
  storyProblem,
  storyQuiz,
  storyWords,
  wordsInStory,
} from "../ai-story";
import { newSrsState } from "../migrate";
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

// Story words are letters only, so no digits in test words.
const letters = (i: number) => `word${"abcdefghijklmnopqrstuvwxyz"[i % 26]}${i >= 26 ? "x" : ""}`;

describe("pickStoryWords", () => {
  it("picks 12 distinct random words, or all of them when there are fewer", () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`w${i}`, letters(i)));
    const picked = pickStoryWords(cards);
    expect(picked).toHaveLength(12);
    expect(new Set(picked.map((w) => w.word)).size).toBe(12);
    expect(pickStoryWords(cards.slice(0, 5))).toHaveLength(5);
    expect(pickStoryWords([card("a", "Cat"), card("b", "cat")])).toHaveLength(1);
  });
  it("is random but follows the random source", () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`w${i}`, letters(i)));
    const seq = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    expect(pickStoryWords(cards, 12, seq(1))).toEqual(pickStoryWords(cards, 12, seq(1)));
    expect(pickStoryWords(cards, 12, seq(1))).not.toEqual(pickStoryWords(cards, 12, seq(2)));
  });
  it("skips cards without an English word", () => {
    const fr = { ...card("x", "chat"), src: "fr", tgt: "ar" } as Flashcard;
    expect(pickStoryWords([fr, card("a", "cat")]).map((w) => w.id)).toEqual(["a"]);
  });
});

describe("isStoryWord / storyWords", () => {
  it("accepts letters, spaces, hyphens and apostrophes only", () => {
    for (const w of ["cat", "thank you", "T-shirt", "o'clock", "don’t", "café"]) expect(isStoryWord(w)).toBe(true);
    for (const w of ["", "a.m.", "3D", "cat!", "(to) go", "x".repeat(41), "-'"]) expect(isStoryWord(w)).toBe(false);
  });
  it("leaves out words the server would refuse, so they don't fail the story", () => {
    expect(storyWords([card("a", "cat"), card("b", "3D"), card("c", "dog")]).map((w) => w.id)).toEqual(["a", "c"]);
  });
});

const REPLY = {
  title: "A Day at the Market",
  sentences: [
    { en: "Tom goes to the market.", tr: "Tom va au marché." },
    { en: "He buys an apple.", tr: "Il achète une pomme." },
    { en: "It is red.", tr: "Elle est rouge." },
    { en: "He sees his friend Ana.", tr: "Il voit son amie Ana." },
    { en: "She says hello.", tr: "Elle dit bonjour." },
    { en: "They walk home.", tr: "Ils rentrent à la maison." },
    { en: "At home, Tom eats the apple.", tr: "À la maison, Tom mange la pomme." },
  ],
};

describe("readStory", () => {
  it("puts the sentences in up to 3 paragraphs, in order", () => {
    const story = readStory(REPLY)!;
    expect(story.title).toBe("A Day at the Market");
    expect(story.paragraphs.map((p) => p.length)).toEqual([3, 3, 1]);
    expect(story.paragraphs.flat()).toEqual(REPLY.sentences);
    expect(readStory({ title: "Hi", sentences: REPLY.sentences.slice(0, 2) })!.paragraphs).toHaveLength(2);
  });
  it("trims, drops empty or broken sentences, and gives an untitled story a title", () => {
    const story = readStory({
      title: "  ",
      sentences: [{ en: " Tom runs. ", tr: " Tom court. " }, { en: "", tr: "x" }, null as never, { en: "Hi.", tr: 3 as never }],
    })!;
    expect(story.title).toBe("Tom runs");
    expect(story.paragraphs.flat()).toEqual([{ en: "Tom runs.", tr: "Tom court." }]);
  });
  it("rejects an empty, malformed or unsuitable story", () => {
    expect(readStory({ title: "T", sentences: [] })).toBeNull();
    expect(readStory({ title: "T" } as never)).toBeNull();
    expect(readStory(null as never)).toBeNull();
    expect(readStory({ ...REPLY, title: "The killer" })).toBeNull();
    expect(readStory({ ...REPLY, sentences: [...REPLY.sentences, { en: "Then he saw a gun.", tr: "x" }] })).toBeNull();
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
    const story = {
      title: "Thank you",
      paragraphs: [[{ en: "The children went home.", tr: "" }], [{ en: "She goes there.", tr: "" }]],
    };
    const { used, missed } = wordsInStory(story, words);
    expect(used.map((w) => w.id).sort()).toEqual(["1", "2", "3"]);
    expect(missed.map((w) => w.id)).toEqual(["4"]);
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

describe("storyQuiz", () => {
  it("asks the story's sentences with their own translations", () => {
    const story = readStory(REPLY)!;
    const quiz = storyQuiz(story);
    expect(quiz.length).toBeGreaterThanOrEqual(4);
    for (const q of quiz) expect(REPLY.sentences.find((s) => s.en === q.sentence)?.tr).toBe(q.answer);
  });
});

describe("storyProblem", () => {
  it("says what went wrong in plain terms", () => {
    expect(storyProblem(new AiError("offline"))).toEqual({ key: "offline" });
    expect(storyProblem(new AiError("unsafe"))).toEqual({ key: "unsafe" });
    for (const code of ["not_configured", "upstream", "bad_request", "forbidden"] as const) {
      expect(storyProblem(new AiError(code))).toEqual({ key: "unavailable" });
    }
    expect(storyProblem(new Error("x"))).toEqual({ key: "unavailable" });
  });
  it("uses the wait the server gives when busy", () => {
    expect(storyProblem(new AiError("busy"))).toEqual({ key: "busy" });
    expect(storyProblem(new AiError("busy", 30))).toEqual({ key: "busy" });
    expect(storyProblem(new AiError("busy", 150))).toEqual({ key: "busyMinutes", minutes: 3 });
    expect(storyProblem(new AiError("busy", 7200))).toEqual({ key: "busyLater" });
  });
});
