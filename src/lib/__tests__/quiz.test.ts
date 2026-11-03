import { describe, expect, it } from "vitest";
import { acceptedAnswers, answerDiff, checkAnswer, closestAnswer, choicesFor, distinctCount, levenshtein, normalizeAnswer } from "../quiz";

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

describe("acceptedAnswers", () => {
  it("accepts answers without the article and each alternative", () => {
    expect(checkAnswer("chat", acceptedAnswers("le chat"))).toBe("correct");
    expect(checkAnswer("eat", acceptedAnswers("to eat"))).toBe("correct");
    expect(checkAnswer("maison", acceptedAnswers("la maison / le domicile"))).toBe("correct");
    expect(checkAnswer("كتاب", acceptedAnswers("الكتاب"))).toBe("correct");
    expect(checkAnswer("chien", acceptedAnswers("le chat"))).toBe("wrong");
  });
  it("handles notes in brackets and gender endings", () => {
    expect(checkAnswer("enchanté", acceptedAnswers("enchanté(e)"))).toBe("correct");
    expect(checkAnswer("enchantée", acceptedAnswers("enchanté(e)"))).toBe("correct");
    expect(checkAnswer("désolée", acceptedAnswers("pardon / désolé(e)"))).toBe("correct");
    expect(checkAnswer("loin", acceptedAnswers("loin (de)"))).toBe("correct");
    expect(checkAnswer("combien", acceptedAnswers("combien (quantité, prix)"))).toBe("correct");
    expect(checkAnswer("prix", acceptedAnswers("combien (quantité, prix)"))).toBe("wrong");
    expect(checkAnswer("بعيد", acceptedAnswers("بعيد (عن)"))).toBe("correct");
  });
  it("accepts common Arabic spelling variants and the article", () => {
    expect(checkAnswer("مستشفي", acceptedAnswers("مستشفى"))).toBe("correct");
    expect(checkAnswer("مدرسه", acceptedAnswers("مدرسة"))).toBe("correct");
    expect(checkAnswer("الحاسوب", acceptedAnswers("حاسوب"))).toBe("correct");
  });
});

describe("closestAnswer", () => {
  it("picks the alternative nearest to what was typed", () => {
    expect(closestAnswer("desole", acceptedAnswers("pardon / désolé(e)"))).toBe("désolé");
  });
});

describe("answerDiff", () => {
  it("marks missing and extra letters", () => {
    expect(answerDiff("bonjur", "bonjour")).toEqual([
      { text: "bonj", kind: "same" },
      { text: "o", kind: "missing" },
      { text: "ur", kind: "same" },
    ]);
    expect(answerDiff("catt", "cat")).toEqual([
      { text: "cat", kind: "same" },
      { text: "t", kind: "extra" },
    ]);
  });
});
