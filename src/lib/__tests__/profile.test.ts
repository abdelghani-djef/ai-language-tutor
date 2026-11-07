import { describe, expect, it } from "vitest";
import { newSrsState } from "../migrate";
import { afterSetup, cleanName, GATED, guessLang, isGated, safeNext } from "../profile";
import type { Flashcard } from "../store";

let n = 0;
/** A hand-built English card translated into `tgt`. */
function card(tgt: string, src = "en"): Flashcard {
  n += 1;
  return {
    id: `c${n}`,
    front: `word${n}`,
    back: `mot${n}`,
    src,
    tgt,
    srs: newSrsState(`c${n}`, 0),
    createdAt: n,
    status: "learn",
  };
}

describe("guessLang", () => {
  it("picks the language most of the learner's words are in", () => {
    expect(guessLang([card("ar"), card("ar"), card("fr"), card("ar")], null, "fr")).toBe("ar");
  });

  it("ignores words that aren't English with French or Arabic", () => {
    expect(guessLang([card("ar", "fr"), card("ar", "fr"), card("de"), card("fr")], null, "en")).toBe("fr");
  });

  it("falls back to the saved ready-made lists' language", () => {
    expect(guessLang([], "fr", "ar")).toBe("fr");
  });

  it("falls back to the interface language when it is French or Arabic", () => {
    expect(guessLang([], null, "ar")).toBe("ar");
    expect(guessLang([], "", "ar")).toBe("ar");
    expect(guessLang([], "es", "ar")).toBe("ar");
  });

  it("falls back to French last", () => {
    expect(guessLang([], null, "en")).toBe("fr");
  });

  it("goes down the fallbacks on a tie", () => {
    expect(guessLang([card("fr"), card("ar")], null, "ar")).toBe("ar");
    expect(guessLang([card("fr"), card("ar")], null, "en")).toBe("fr");
  });
});

describe("safeNext", () => {
  it("keeps a path on this site, with its query", () => {
    expect(safeNext("/study/?list=food")).toBe("/study/?list=food");
    expect(safeNext("/my-words/")).toBe("/my-words/");
  });

  it("refuses anything that could leave the site or loop back to setup", () => {
    for (const bad of ["//evil.com", "https://x", "/start/", "/start", "/start/?next=/study/", "\\x", "/\\evil.com", "/x?u=https://y", "study", "", null]) {
      expect(safeNext(bad), String(bad)).toBeNull();
    }
  });
});

describe("afterSetup", () => {
  it("sends a learner with words where they were headed, or to My words", () => {
    expect(afterSetup("/study/?list=food", true)).toBe("/study/?list=food");
    expect(afterSetup(null, true)).toBe("/my-words/");
    expect(afterSetup("//evil.example", true)).toBe("/my-words/");
  });

  it("sends a new learner to picking lists, unless they were going to pick, sort or add words", () => {
    for (const next of ["/study/", "/stats/", "/my-words/", "/story/", "/quiz/?list=food", null, "/wordsmith/"]) {
      expect(afterSetup(next, false), String(next)).toBe("/words/");
    }
    for (const next of ["/words/", "/sort/?lists=food", "/add/", "/add"]) {
      expect(afterSetup(next, false), next).toBe(next);
    }
  });
});

describe("isGated", () => {
  it("gates the pages that need a language, with or without the trailing slash", () => {
    expect(isGated("/study/")).toBe(true);
    expect(isGated("/study")).toBe(true);
    expect(isGated("/study/x")).toBe(true);
    expect(isGated("/words")).toBe(true);
    for (const p of GATED) expect(isGated(p)).toBe(true);
  });

  it("leaves the home page, setup and the word page open", () => {
    expect(isGated("/")).toBe(false);
    expect(isGated("/start/")).toBe(false);
    expect(isGated("/start")).toBe(false);
    expect(isGated("/word/")).toBe(false);
    expect(isGated("/studying")).toBe(false);
  });
});

describe("cleanName", () => {
  it("drops control characters and trims", () => {
    expect(cleanName("\u0000Lina\n")).toBe("Lina");
  });

  it("keeps at most 30 letters, Arabic included", () => {
    const long = "ب".repeat(31);
    expect(Array.from(cleanName(long)!)).toHaveLength(30);
  });

  it("doesn't split an emoji made of several code points at the limit", () => {
    expect(cleanName("a".repeat(29) + "👍🏽")).toBe("a".repeat(29));
    expect(cleanName("a".repeat(28) + "👍🏽")).toBe("a".repeat(28) + "👍🏽");
  });

  it("gives nothing for an empty name", () => {
    expect(cleanName("   ")).toBeUndefined();
  });
});
