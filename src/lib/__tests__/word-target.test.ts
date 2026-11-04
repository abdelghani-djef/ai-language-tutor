import { describe, expect, it } from "vitest";
import type { Flashcard } from "../store";
import { cleanWord, packOf, targetFromCard, targetFromParams, wordHref } from "../word/target";

function card(over: Partial<Flashcard>): Flashcard {
  return {
    id: "c1",
    deckId: "d1",
    front: "bread",
    back: "le pain",
    src: "en",
    tgt: "fr",
    srs: {} as Flashcard["srs"],
    createdAt: 0,
    ...over,
  };
}

describe("cleanWord", () => {
  it("drops end punctuation, brackets and curly apostrophes", () => {
    expect(cleanWord("how are you?")).toBe("how are you");
    expect(cleanWord("you’re welcome")).toBe("you're welcome");
    expect(cleanWord("loin (de)")).toBe("loin");
  });
});

describe("targetFromCard", () => {
  it("uses the front when it is English", () => {
    expect(targetFromCard(card({ pack: "food" }))).toEqual({
      word: "bread",
      lang: "en",
      to: "fr",
      cardId: "c1",
      pack: "food",
    });
  });
  it("uses the back when it is English", () => {
    const t = targetFromCard(card({ src: "fr", tgt: "en", front: "pain", back: "bread" }));
    expect(t.word).toBe("bread");
    expect(t.lang).toBe("en");
    expect(t.to).toBe("fr");
  });
  it("uses the back when neither side is English", () => {
    const t = targetFromCard(card({ src: "fr", tgt: "es", front: "pain", back: "pan" }));
    expect(t).toMatchObject({ word: "pan", lang: "es", to: "fr", cardId: "c1" });
    expect(t.pack).toBeUndefined();
  });
  it("keeps the card's own list when the word is in two lists", () => {
    const right = card({ front: "right", back: "à droite" });
    expect(targetFromCard({ ...right, pack: "position" }).pack).toBe("position");
    expect(targetFromCard({ ...right, pack: "describe" }).pack).toBe("describe");
    // A list that does not have the word, or none at all: the first list that does.
    expect(targetFromCard({ ...right, pack: "food" }).pack).toBe("describe");
    expect(targetFromCard(right).pack).toBe("describe");
  });
});

describe("wordHref and targetFromParams", () => {
  it("builds the link", () => {
    expect(wordHref({ word: "thank you", lang: "en", to: "ar" })).toBe("/word/?w=thank%20you&lang=en&to=ar");
    expect(wordHref({ word: "bread", lang: "en", to: "fr", cardId: "c1" })).toBe(
      "/word/?w=bread&lang=en&to=fr&card=c1",
    );
  });
  it("reads it back, with the ready-made list", () => {
    const q = new URLSearchParams("w=thank%20you&lang=en&to=ar");
    expect(targetFromParams(q, "fr")).toEqual({ word: "thank you", lang: "en", to: "ar", pack: "greetings" });
  });
  it("returns null without a word and falls back for `to`", () => {
    expect(targetFromParams(new URLSearchParams(""), "fr")).toBeNull();
    expect(targetFromParams(new URLSearchParams("w=bread&lang=en"), "fr")?.to).toBe("fr");
  });
  it("carries the ready-made list in the link and reads it back", () => {
    const href = wordHref({ word: "right", lang: "en", to: "fr", pack: "position" });
    expect(href).toBe("/word/?w=right&lang=en&to=fr&pack=position");
    expect(targetFromParams(new URLSearchParams(href.split("?")[1]), "fr")?.pack).toBe("position");
  });
  it("falls back to the first list when the link's list is wrong or missing", () => {
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr&pack=food"), "fr")?.pack).toBe("describe");
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr&pack=nope"), "fr")?.pack).toBe("describe");
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr&pack="), "fr")?.pack).toBe("describe");
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr"), "fr")?.pack).toBe("describe");
  });
  it("falls back for empty `lang` and `to`", () => {
    expect(targetFromParams(new URLSearchParams("w=bread&lang=&to="), "ar")).toMatchObject({ lang: "en", to: "ar" });
  });
  it("ignores `lang` and `to` that are not known languages", () => {
    const host = new URLSearchParams({ w: "bread", lang: "evil.example/x?", to: "evil.example/y?" });
    expect(targetFromParams(host, "fr")).toMatchObject({ word: "bread", lang: "en", to: "fr", pack: "food" });
    const proto = new URLSearchParams("w=bread&lang=constructor&to=__proto__");
    expect(targetFromParams(proto, "ar")).toMatchObject({ lang: "en", to: "ar" });
    expect(targetFromParams(new URLSearchParams("w=bread&lang=toString&to=hasOwnProperty"), "fr")).toMatchObject({
      lang: "en",
      to: "fr",
    });
    expect(targetFromParams(new URLSearchParams("w=pain&lang=fr&to=ar"), "en")).toMatchObject({ lang: "fr", to: "ar" });
  });
  it("reads the saved word id", () => {
    expect(targetFromParams(new URLSearchParams("w=bread&lang=en&to=fr&card=c9"), "fr")?.cardId).toBe("c9");
  });
});

describe("packOf", () => {
  it("finds the ready-made list, ignoring case and punctuation", () => {
    expect(packOf("Thank you")).toBe("greetings");
    expect(packOf("hello?")).toBe("greetings");
    expect(packOf("zzzzqx")).toBeUndefined();
  });
  it("prefers the given list when it has the word", () => {
    expect(packOf("right")).toBe("describe");
    expect(packOf("right", "position")).toBe("position");
    expect(packOf("Right!", "position")).toBe("position");
    expect(packOf("right", "food")).toBe("describe");
    expect(packOf("right", "")).toBe("describe");
    expect(packOf("zzzzqx", "position")).toBeUndefined();
  });
});
