import { describe, expect, it } from "vitest";
import { newSrsState } from "../migrate";
import { highlightWords, todaysCards, wordForms } from "../story";
import type { Flashcard, Review } from "../store";

describe("wordForms", () => {
  it("adds regular and irregular forms", () => {
    expect(wordForms("walk")).toEqual(expect.arrayContaining(["walk", "walks", "walked", "walking"]));
    expect(wordForms("stop")).toEqual(expect.arrayContaining(["stopped", "stopping"]));
    expect(wordForms("make")).toEqual(expect.arrayContaining(["made", "making", "makes"]));
    expect(wordForms("baby")).toContain("babies");
    expect(wordForms("go")).toEqual(expect.arrayContaining(["went", "goes"]));
    expect(wordForms("big")).toContain("bigger");
    expect(wordForms("leaf")).toContain("leaves");
    expect(wordForms("wake up")).toEqual(expect.arrayContaining(["woke up", "wakes up", "waking up"]));
    expect(wordForms("take off")).toContain("took off");
    expect(wordForms("put on")).toEqual(expect.arrayContaining(["put on", "puts it on"]));
    expect(wordForms("potato")).toContain("potatoes");
  });
  it("adds no endings to very short words", () => {
    expect(wordForms("hi")).toEqual(["hi"]);
    expect(wordForms("be")).not.toContain("bed");
  });
});

describe("highlightWords", () => {
  const cards = [
    { id: "a", word: "thank you" },
    { id: "b", word: "cat" },
    { id: "c", word: "walk" },
    { id: "d", word: "hi" },
    { id: "e", word: "I don’t understand" },
    { id: "f", word: "child" },
  ];
  it("links words, their forms and phrases to their cards", () => {
    const text = "Thank you! The cats walked home. I don't understand, said the children.";
    const parts = highlightWords(text, cards);
    expect(parts.filter((p) => p.cardId).map((p) => [p.text, p.cardId])).toEqual([
      ["Thank you", "a"],
      ["cats", "b"],
      ["walked", "c"],
      ["I don't understand", "e"],
      ["children", "f"],
    ]);
    expect(parts.map((p) => p.text).join("")).toBe(text);
  });
  it("doesn't match inside other words or short words' look-alikes", () => {
    expect(highlightWords("A catalogue. His hat.", cards).some((p) => p.cardId)).toBe(false);
  });
});

describe("starter stories", () => {
  it("make every word they list tappable", async () => {
    const { STARTER_STORIES } = await import("../../data/starter-stories");
    const missing: string[] = [];
    for (const s of STARTER_STORIES) {
      const cards = s.uses.map((w, i) => ({ id: String(i), word: w.replace(/[?!.]+$/, "") }));
      const found = new Set(highlightWords(`${s.title.en}\n${s.text.en}`, cards).map((p) => p.cardId));
      cards.forEach((c) => found.has(c.id) || missing.push(`${s.id}: ${c.word}`));
    }
    expect(missing).toEqual([]);
  });
});

describe("todaysCards", () => {
  const card = (id: string, p: Partial<Flashcard> = {}): Flashcard => ({
    id,
    front: id,
    back: `${id}-fr`,
    src: "en",
    tgt: "fr",
    srs: newSrsState(id, 0),
    createdAt: 0,
    status: "learn",
    ...p,
  });
  const review = (cardId: string, day: string, reviewedAt: number): Review => ({ cardId, rating: 3, reviewedAt, day });
  const today = "2026-11-07";

  it("lists the words reviewed today, most recent first, one per English word", () => {
    const cards = [card("cat"), card("dog"), card("cat2", { front: "Cat" }), card("old")];
    const reviews = [
      review("old", "2026-11-06", 1),
      review("cat", today, 2),
      review("dog", today, 3),
      review("cat2", today, 4),
      review("cat", today, 5),
    ];
    expect(todaysCards(cards, reviews, today).map((c) => c.id)).toEqual(["cat", "dog"]);
  });

  it("keeps only the given cards and words with an English side", () => {
    const cards = [card("cat"), card("perro", { src: "es", tgt: "de", back: "Hund" })];
    const reviews = [review("cat", today, 1), review("perro", today, 2), review("gone", today, 3)];
    expect(todaysCards(cards, reviews, today).map((c) => c.id)).toEqual(["cat"]);
    expect(todaysCards([], reviews, today)).toEqual([]);
  });
});
