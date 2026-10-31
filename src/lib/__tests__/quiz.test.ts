import { describe, expect, it } from "vitest";
import { checkAnswer, choicesFor, distinctCount, levenshtein, normalizeAnswer } from "../quiz";

describe("normalizeAnswer", () => {
  it("ignores case, accents, punctuation and Arabic harakat", () => {
    expect(normalizeAnswer("  Ça va ?! ")).toBe("ca va");
    expect(normalizeAnswer("مَرْحَبًا")).toBe("مرحبا");
  });
  it("keeps marks that change the word in other scripts", () => {
    expect(normalizeAnswer("नमस्ते")).toBe("नमस्ते");
    expect(normalizeAnswer("が")).not.toBe(normalizeAnswer("か"));
    expect(normalizeAnswer("안녕")).toBe("안녕");
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
  it("accepts any of several expected answers", () => {
    expect(checkAnswer("rive", ["banque", "rive"])).toBe("correct");
    expect(checkAnswer("banqe", ["banque", "rive"])).toBe("close");
    expect(checkAnswer("chat", ["banque", "rive"])).toBe("wrong");
    expect(checkAnswer("bibliotheqe", ["livre", "bibliothèque"])).toBe("close");
  });
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("distinctCount", () => {
  it("counts answers that differ only by case or accents once", () => {
    expect(distinctCount(["Café", "cafe", "thé", "eau"])).toBe(3);
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
