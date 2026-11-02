import { describe, expect, it } from "vitest";
import { defineMessages, translator } from "../i18n";
import { cleanTags } from "../store";

const m = defineMessages({
  en: { hi: "Hi {name}", cards: { one: "{count} card", other: "{count} cards" } },
  fr: { hi: "Salut {name}", cards: { one: "{count} carte", other: "{count} cartes" } },
  ar: {
    hi: "مرحبا {name}",
    cards: { zero: "لا بطاقات", one: "بطاقة واحدة", two: "بطاقتان", few: "{count} بطاقات", other: "{count} بطاقة" },
  },
});

describe("translator", () => {
  it("fills placeholders", () => {
    expect(translator(m, "fr")("hi", { name: "Lina" })).toBe("Salut Lina");
  });
  it("picks plural forms per language", () => {
    expect(translator(m, "en")("cards", { count: 1 })).toBe("1 card");
    expect(translator(m, "en")("cards", { count: 1200 })).toBe("1,200 cards");
    expect(translator(m, "fr")("cards", { count: 0 })).toBe("0 carte");
    const ar = translator(m, "ar");
    expect([0, 1, 2, 5, 11].map((n) => ar("cards", { count: n }))).toEqual([
      "لا بطاقات",
      "بطاقة واحدة",
      "بطاقتان",
      "5 بطاقات",
      "11 بطاقة",
    ]);
  });
});

describe("cleanTags", () => {
  it("trims, drops # and case-insensitive duplicates", () => {
    expect(cleanTags([" #Food ", "food", "", "  verbs  of  motion "])).toEqual(["Food", "verbs of motion"]);
  });
});
