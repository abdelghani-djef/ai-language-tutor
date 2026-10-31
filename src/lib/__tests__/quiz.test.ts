import { describe, expect, it } from "vitest";
import { checkAnswer, choicesFor, levenshtein, normalizeAnswer } from "../quiz";

describe("normalizeAnswer", () => {
  it("ignores case, accents, punctuation and Arabic harakat", () => {
    expect(normalizeAnswer("  Ça va ?! ")).toBe("ca va");
    expect(normalizeAnswer("مَرْحَبًا")).toBe("مرحبا");
  });
});

describe("checkAnswer", () => {
  it("accepts exact and accent-insensitive answers", () => {
    expect(checkAnswer("cafe", "café")).toBe("correct");
  });
  it("treats a small typo in a longer word as close", () => {
    expect(checkAnswer("bibliotheqe", "bibliothèque")).toBe("close");
  });
  it("rejects wrong or empty answers", () => {
    expect(checkAnswer("chat", "chien")).toBe("wrong");
    expect(checkAnswer("", "chien")).toBe("wrong");
  });
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("choicesFor", () => {
  it("returns the answer plus three distinct distractors", () => {
    const c = choicesFor("chat", ["chat", "chien", "Chien", "oiseau", "poisson", "cheval"]);
    expect(c).toHaveLength(4);
    expect(c).toContain("chat");
    expect(new Set(c.map(normalizeAnswer)).size).toBe(4);
  });
});
