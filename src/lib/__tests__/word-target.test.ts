import { describe, expect, it } from "vitest";
import { STARTER_WORDS as W } from "../../data/starter-words";
import type { Flashcard } from "../store";
import { cardHref, cleanWord, packOf, targetFromCard, targetFromParams, wordHref } from "../word/target";

function card(over: Partial<Flashcard>): Flashcard {
  return {
    id: "c1",
    front: "bread",
    back: "le pain",
    src: "en",
    tgt: "fr",
    srs: {} as Flashcard["srs"],
    createdAt: 0,
    status: "learn",
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
    expect(targetFromCard(card({ pack: "food" }), W)).toEqual({
      word: "bread",
      lang: "en",
      to: "fr",
      cardId: "c1",
      pack: "food",
    });
  });
  it("uses the back when it is English", () => {
    const t = targetFromCard(card({ src: "fr", tgt: "en", front: "pain", back: "bread" }), W);
    expect(t.word).toBe("bread");
    expect(t.lang).toBe("en");
    expect(t.to).toBe("fr");
  });
  it("uses the back when neither side is English", () => {
    const t = targetFromCard(card({ src: "fr", tgt: "es", front: "pain", back: "pan" }), W);
    expect(t).toMatchObject({ word: "pan", lang: "es", to: "fr", cardId: "c1" });
    expect(t.pack).toBeUndefined();
  });
  it("keeps the card's own list when the word is in two lists", () => {
    const right = card({ front: "right", back: "à droite" });
    expect(targetFromCard({ ...right, pack: "position" }, W).pack).toBe("position");
    expect(targetFromCard({ ...right, pack: "describe" }, W).pack).toBe("describe");
    // A list that does not have the word, or none at all: the first list that does.
    expect(targetFromCard({ ...right, pack: "food" }, W).pack).toBe("describe");
    expect(targetFromCard(right, W).pack).toBe("describe");
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
    expect(targetFromParams(q, "fr", W)).toEqual({ word: "thank you", lang: "en", to: "ar", pack: "greetings" });
  });
  it("returns null without a word and falls back for `to`", () => {
    expect(targetFromParams(new URLSearchParams(""), "fr", W)).toBeNull();
    expect(targetFromParams(new URLSearchParams("w=bread&lang=en"), "fr", W)?.to).toBe("fr");
  });
  it("carries the ready-made list in the link and reads it back", () => {
    const href = wordHref({ word: "right", lang: "en", to: "fr", pack: "position" });
    expect(href).toBe("/word/?w=right&lang=en&to=fr&pack=position");
    expect(targetFromParams(new URLSearchParams(href.split("?")[1]), "fr", W)?.pack).toBe("position");
  });
  it("falls back to the first list when the link's list is wrong or missing", () => {
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr&pack=food"), "fr", W)?.pack).toBe("describe");
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr&pack=nope"), "fr", W)?.pack).toBe("describe");
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr&pack="), "fr", W)?.pack).toBe("describe");
    expect(targetFromParams(new URLSearchParams("w=right&lang=en&to=fr"), "fr", W)?.pack).toBe("describe");
  });
  it("falls back for empty `lang` and `to`", () => {
    expect(targetFromParams(new URLSearchParams("w=bread&lang=&to="), "ar", W)).toMatchObject({ lang: "en", to: "ar" });
  });
  it("ignores `lang` and `to` that are not known languages", () => {
    const host = new URLSearchParams({ w: "bread", lang: "evil.example/x?", to: "evil.example/y?" });
    expect(targetFromParams(host, "fr", W)).toMatchObject({ word: "bread", lang: "en", to: "fr", pack: "food" });
    const proto = new URLSearchParams("w=bread&lang=constructor&to=__proto__");
    expect(targetFromParams(proto, "ar", W)).toMatchObject({ lang: "en", to: "ar" });
    expect(targetFromParams(new URLSearchParams("w=bread&lang=toString&to=hasOwnProperty"), "fr", W)).toMatchObject({
      lang: "en",
      to: "fr",
    });
    expect(targetFromParams(new URLSearchParams("w=pain&lang=fr&to=ar"), "en", W)).toMatchObject({ lang: "fr", to: "ar" });
  });
  it("reads the saved word id", () => {
    expect(targetFromParams(new URLSearchParams("w=bread&lang=en&to=fr&card=c9"), "fr", W)?.cardId).toBe("c9");
  });
});

describe("packOf", () => {
  it("finds the ready-made list, ignoring case and punctuation", () => {
    expect(packOf("Thank you", W)).toBe("greetings");
    expect(packOf("hello?", W)).toBe("greetings");
    expect(packOf("zzzzqx", W)).toBeUndefined();
  });
  it("prefers the given list when it has the word", () => {
    expect(packOf("right", W)).toBe("describe");
    expect(packOf("right", W, "position")).toBe("position");
    expect(packOf("Right!", W, "position")).toBe("position");
    expect(packOf("right", W, "food")).toBe("describe");
    expect(packOf("right", W, "")).toBe("describe");
    expect(packOf("zzzzqx", W, "position")).toBeUndefined();
    // Names every object has are not lists.
    expect(packOf("right", W, "constructor")).toBe("describe");
    expect(packOf("right", W, "__proto__")).toBe("describe");
  });
  it("uses only the words it is given", () => {
    expect(packOf("bread", {})).toBeUndefined();
    expect(packOf("bread", { travel: [["bread", "le pain", "الخبز", "", "Bread."]] })).toBe("travel");
  });
});

describe("cardHref", () => {
  const cases: Flashcard[] = [
    card({ pack: "food" }),
    card({}),
    card({ front: "right", back: "à droite", pack: "position" }),
    card({ front: "right", back: "correct", pack: "describe" }),
    card({ front: "right", back: "à droite", pack: "food" }),
    card({ front: "right", back: "à droite" }),
    card({ front: "zzzzqx", back: "rien", pack: "food" }),
    card({ src: "fr", tgt: "en", front: "pain", back: "bread" }),
    card({ src: "fr", tgt: "es", front: "pain", back: "pan", pack: "food" }),
  ];
  it("links to the word page the card's target is, without the lists' words", () => {
    for (const c of cases) {
      const query = new URLSearchParams(cardHref(c).split("?")[1]);
      const { cardId, ...rest } = targetFromCard(c, W);
      expect(query.get("card")).toBe(cardId);
      // The word page reads the same word and list from the link (as it does when the card is gone).
      const { cardId: linked, ...fromLink } = targetFromParams(query, "fr", W)!;
      expect(linked).toBe(cardId);
      expect(fromLink).toEqual(rest);
    }
  });
  it("gives the card's own list as the hint", () => {
    expect(cardHref(card({ pack: "food" }))).toBe("/word/?w=bread&lang=en&to=fr&card=c1&pack=food");
    expect(cardHref(card({}))).toBe("/word/?w=bread&lang=en&to=fr&card=c1");
    expect(cardHref(card({ src: "fr", tgt: "es", front: "pain", back: "pan", pack: "food" }))).toBe(
      "/word/?w=pan&lang=es&to=fr&card=c1",
    );
  });
});
