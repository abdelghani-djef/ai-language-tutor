import { describe, expect, it } from "vitest";
import { lateV1Seen, mergeLateV1, migrateV1, sameWordKey, type V1Data } from "../migrate";
import { newSrsCard } from "../srs";

// Saved v1 data is JSON, so review states have their dates as strings.
// The shape is copied from a newSrsCard() result.
function srs(over: Record<string, unknown> = {}) {
  return {
    stability: 0,
    stabilityFast: 0,
    difficulty: 0,
    state: 0,
    scheduleStatus: "new",
    dueAt: "2026-01-01T00:00:00.000Z",
    lastReviewAt: null,
    cardId: "c0",
    reps: 0,
    lapses: 0,
    scheduledDays: 0,
    learningStep: 0,
    ...over,
  };
}

const S1 = srs({
  state: 2,
  scheduleStatus: "review",
  stability: 12.5,
  difficulty: 4.2,
  reps: 4,
  scheduledDays: 12,
  dueAt: "2026-02-10T00:00:00.000Z",
  lastReviewAt: "2026-01-29T00:00:00.000Z",
  cardId: "s1",
});
const S2 = srs({
  state: 1,
  scheduleStatus: "learning",
  stability: 0.8,
  difficulty: 6,
  reps: 1,
  learningStep: 1,
  dueAt: "2026-01-30T00:10:00.000Z",
  lastReviewAt: "2026-01-30T00:00:00.000Z",
  cardId: "s2",
});

let nextId = 0;
function card(over: Record<string, unknown>) {
  return { id: `card${nextId++}`, deckId: "d1", src: "en", tgt: "fr", createdAt: 1000, srs: srs(), ...over };
}

function review(cardId: string, over: Record<string, unknown> = {}) {
  return { cardId, rating: 3, reviewedAt: 2000, day: "2026-01-30", ...over };
}

const settings = { dailyGoal: 30, newPerDay: 12, plan: { routine: "coffee", minutes: 5 } };
const rewards = { badges: { first: 123 }, goalDays: ["2026-01-30"], perfectQuizzes: 2 };
const decks = [
  { id: "d1", name: "Pets", src: "en", tgt: "fr", createdAt: 1 },
  { id: "d2", name: "Food", src: "en", tgt: "fr", createdAt: 2 },
];

type OutCard = ReturnType<typeof migrateV1>["cards"][number];
const byId = (cards: OutCard[], id: string) => cards.find((c) => c.id === id)!;

describe("migrateV1", () => {
  it("keeps every card, review and setting", () => {
    const raw: V1Data = {
      decks,
      cards: [
        card({ id: "a", front: "cat", back: "chat" }),
        card({ id: "b", front: "dog", back: "chien" }),
        card({ id: "c", deckId: "d2", front: "bread", back: "le pain", pack: "food" }),
      ],
      reviews: [review("a"), review("b", { direction: "reverse" }), review("c", { intro: true })],
      settings,
      rewards,
    };
    const out = migrateV1(raw, 5000);
    expect(out.version).toBe(2);
    expect("decks" in out).toBe(false);
    expect(out.cards.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(out.reviews).toEqual(raw.reviews);
    expect(out.settings).toEqual(settings);
    expect(out.rewards).toEqual(rewards);
    expect(out.known).toEqual({});
  });

  it("marks every word Should learn", () => {
    const out = migrateV1({
      decks,
      cards: [card({ front: "cat", back: "chat" }), card({ deckId: "d2", front: "bread", back: "le pain", pack: "food" })],
    });
    for (const c of out.cards) {
      expect(c.status).toBe("learn");
      expect("deckId" in c).toBe(false);
    }
  });

  it("tags own words with their old list name", () => {
    const out = migrateV1({
      decks,
      cards: [
        card({ id: "own", front: "cat", back: "chat", src: "en", tgt: "fr", deckId: "d1" }),
        card({ id: "packed", front: "bread", back: "le pain", pack: "food", deckId: "d2" }),
      ],
    });
    expect(byId(out.cards, "own").tags).toContain("Pets");
    expect(byId(out.cards, "packed").tags ?? []).not.toContain("Food");
  });

  it("turns French-first words English-first", () => {
    const raw: V1Data = {
      decks,
      cards: [
        card({ id: "fr1", src: "fr", tgt: "en", front: "chat", back: "cat", srs: S1, srsReverse: S2, introducedAt: 1500 }),
        card({ id: "other", front: "dog", back: "chien" }),
      ],
      reviews: [
        review("fr1", { direction: "forward", rating: 1, reviewedAt: 2001, day: "2026-01-28" }),
        review("fr1", { rating: 4, reviewedAt: 2002, day: "2026-01-29" }),
        review("fr1", { direction: "reverse", rating: 2, reviewedAt: 2003, day: "2026-01-30" }),
        review("other", { direction: "forward" }),
        review("other"),
      ],
    };
    const out = migrateV1(raw, 5000);
    const c = byId(out.cards, "fr1");
    expect(c).toMatchObject({ src: "en", tgt: "fr", front: "cat", back: "chat", exampleLang: "en" });
    expect(c.srs).toEqual(S2);
    expect(c.srsReverse).toEqual(S1);

    const mine = out.reviews.filter((r) => r.cardId === "fr1");
    expect(mine.map((r) => r.direction)).toEqual(["reverse", "reverse", "forward"]);
    expect(mine.map((r) => [r.rating, r.reviewedAt, r.day])).toEqual([
      [1, 2001, "2026-01-28"],
      [4, 2002, "2026-01-29"],
      [2, 2003, "2026-01-30"],
    ]);
    expect(out.reviews.filter((r) => r.cardId === "other")).toEqual([review("other", { direction: "forward" }), review("other")]);
  });

  it("a French-first word not yet started just flips", () => {
    const old = srs({ cardId: "untouched" });
    const out = migrateV1({ cards: [card({ id: "n", src: "fr", tgt: "en", front: "chien", back: "dog", srs: old })] });
    const c = byId(out.cards, "n");
    expect(c).toMatchObject({ src: "en", tgt: "fr", front: "dog", back: "chien" });
    expect(c.srs).toEqual(old);
    expect(c.srsReverse).toBeUndefined();
  });

  it("a started French-first word with no reverse gets a fresh forward state", async () => {
    const out = migrateV1({ cards: [card({ id: "s", src: "fr", tgt: "en", front: "chat", back: "cat", srs: S1 })] }, 5000);
    const c = byId(out.cards, "s");
    expect(c.srsReverse).toEqual(S1);
    expect(c.srs.state).toBe(0);
    expect(c.srs.reps).toBe(0);
    expect(c.srs.stability).toBe(0);
    expect(new Date(c.srs.dueAt).getTime()).toBe(5000);
    expect(c.srs.lastReviewAt).toBeNull();
    expect(Object.keys(c.srs).sort()).toEqual(Object.keys(await newSrsCard()).sort());
  });

  it("keeps the word with more progress when one appears twice", () => {
    const out = migrateV1({
      decks,
      cards: [
        card({ id: "first", pack: "food", front: "bread", back: "le pain", tgt: "fr", tags: ["Breakfast"] }),
        card({ id: "second", pack: "food", front: "bread", back: "le pain", tgt: "fr", tags: ["Bakery"], deckId: "d2" }),
      ],
      reviews: [review("first"), review("first"), review("first", { direction: "reverse" }), review("second")],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["first"]);
    expect(out.cards[0].tags).toEqual(["Breakfast", "Bakery"]);
    expect(out.reviews).toHaveLength(4);
  });

  it("does not count first looks as progress", () => {
    const out = migrateV1({
      cards: [
        card({ id: "looked", pack: "food", front: "bread", back: "le pain", createdAt: 1 }),
        card({ id: "studied", pack: "food", front: "bread", back: "le pain", createdAt: 2 }),
      ],
      reviews: [review("looked", { intro: true }), review("looked", { intro: true }), review("studied")],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["studied"]);
    expect(out.reviews).toHaveLength(3);
  });

  it("breaks ties by stability, then by the earlier word", () => {
    const stable = migrateV1({
      cards: [
        card({ id: "weak", pack: "food", front: "bread", back: "le pain", srs: srs({ stability: 1 }) }),
        card({ id: "strong", pack: "food", front: "bread", back: "le pain", srs: srs({ stability: 9 }) }),
      ],
    });
    expect(stable.cards.map((c) => c.id)).toEqual(["strong"]);

    const older = migrateV1({
      cards: [
        card({ id: "newer", pack: "food", front: "bread", back: "le pain", createdAt: 20 }),
        card({ id: "older", pack: "food", front: "bread", back: "le pain", createdAt: 10 }),
      ],
    });
    expect(older.cards.map((c) => c.id)).toEqual(["older"]);
  });

  it("treats own words with the same English word and translation as one, ignoring case", () => {
    const out = migrateV1({
      decks,
      cards: [
        card({ id: "x", front: "Cat", back: "Chat", deckId: "d1" }),
        card({ id: "y", front: "cat", back: "chat", deckId: "d2" }),
        card({ id: "z", front: "cat", back: "le chat", deckId: "d2" }),
      ],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["x", "z"]);
    expect(byId(out.cards, "x").tags).toEqual(["Pets", "Food"]);
  });

  it("keeps the same ready-made word in two languages", () => {
    const out = migrateV1({
      cards: [
        card({ id: "fr", pack: "food", front: "bread", back: "le pain", tgt: "fr" }),
        card({ id: "ar", pack: "food", front: "bread", back: "الخبز", tgt: "ar" }),
      ],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["fr", "ar"]);
  });

  it("keeps the same own word from two different source languages", () => {
    const out = migrateV1({
      cards: [
        card({ id: "en", src: "en", tgt: "ar", front: "taxi", back: "تاكسي", deckId: "x" }),
        card({ id: "frw", src: "fr", tgt: "ar", front: "taxi", back: "تاكسي", deckId: "y" }),
      ],
      reviews: [review("frw"), review("frw")],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["en", "frw"]);
  });

  it("a copy without a creation time never wins a tie", () => {
    const out = migrateV1({
      cards: [
        card({ id: "nodate", front: "cat", back: "chat", createdAt: undefined }),
        card({ id: "dated", front: "cat", back: "chat", createdAt: 5000 }),
      ],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["dated"]);
  });

  it("still merges a turned word with its English-first twin", () => {
    const out = migrateV1({
      cards: [
        card({ id: "a", src: "en", tgt: "fr", front: "cat", back: "chat" }),
        card({ id: "b", src: "fr", tgt: "en", front: "chat", back: "cat" }),
      ],
      reviews: [review("b")],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["b"]);
  });

  it("keeps words in other languages, untouched apart from status", () => {
    const raw = card({ id: "esde", src: "es", tgt: "de", front: "gato", back: "Katze", deckId: "nope" });
    const out = migrateV1({ cards: [raw] });
    const { deckId: _deckId, ...rest } = raw;
    void _deckId;
    expect(out.cards).toEqual([{ ...rest, status: "learn" }]);
  });

  it("keeps an existing status and known words", () => {
    const known = { "fr:food:bread": 42 };
    const out = migrateV1({
      cards: [card({ id: "k", front: "cat", back: "chat", status: "known", knownAt: 7 })],
      known,
    } as V1Data);
    expect(byId(out.cards, "k")).toMatchObject({ status: "known", knownAt: 7 });
    expect(out.known).toEqual(known);
  });

  it("does not change its input", () => {
    const raw: V1Data = {
      decks,
      cards: [card({ id: "fr1", src: "fr", tgt: "en", front: "chat", back: "cat", srs: S1 }), card({ pack: "food", front: "bread", back: "le pain" })],
      reviews: [review("fr1")],
    };
    const copy = structuredClone(raw);
    migrateV1(raw, 5000);
    expect(raw).toEqual(copy);
  });

  it("is idempotent on its own output", () => {
    const raw: V1Data = {
      decks,
      cards: [
        card({ id: "p1", pack: "food", front: "bread", back: "le pain", tgt: "fr" }),
        card({ id: "p2", pack: "food", front: "bread", back: "le pain", tgt: "fr", deckId: "d2" }),
        card({ id: "p3", pack: "food", front: "bread", back: "الخبز", tgt: "ar" }),
        card({ id: "fr1", src: "fr", tgt: "en", front: "chat", back: "cat", srs: S1, srsReverse: S2 }),
        card({ id: "fr2", src: "fr", tgt: "en", front: "chien", back: "dog", srs: S1 }),
        card({ id: "esde", src: "es", tgt: "de", front: "gato", back: "Katze" }),
      ],
      reviews: [review("p1"), review("fr1", { direction: "reverse" }), review("fr2")],
      settings,
      rewards,
    };
    const once = migrateV1(raw, 5000);
    const twice = migrateV1(once, 9000);
    expect(twice).toEqual(once);
  });

  it("gives a fresh forward state its own scheduler id", () => {
    const out = migrateV1({ cards: [card({ id: "s", src: "fr", tgt: "en", front: "chat", back: "cat", srs: S1 })] }, 5000);
    const c = byId(out.cards, "s");
    expect(c.srs.cardId).toBe("s1-f");
    expect(c.srsReverse!.cardId).toBe("s1");
  });

  it("sends the new English-first side of a started word through the first look", () => {
    const out = migrateV1(
      {
        cards: [
          card({ id: "fresh", src: "fr", tgt: "en", front: "chat", back: "cat", srs: S1, introducedAt: 1500 }),
          card({ id: "both", src: "fr", tgt: "en", front: "chien", back: "dog", srs: S1, srsReverse: S2, introducedAt: 1500 }),
        ],
      },
      5000,
    );
    expect(byId(out.cards, "fresh").introducedAt).toBeUndefined();
    expect(byId(out.cards, "both").introducedAt).toBe(1500);
  });

  it("keeps the details of a dropped copy that the kept word lacks", () => {
    const out = migrateV1({
      cards: [
        card({ id: "kept", pack: "food", front: "bread", back: "le pain", notes: "mine", createdAt: 1 }),
        card({ id: "d1", pack: "food", front: "bread", back: "le pain", notes: "theirs", emoji: "🍞", createdAt: 2 }),
        card({ id: "d2", pack: "food", front: "bread", back: "le pain", example: "Hello", exampleLang: "en", image: "data:image/png;base64,AA", createdAt: 3 }),
      ],
    });
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0]).toMatchObject({
      id: "kept",
      notes: "mine",
      emoji: "🍞",
      example: "Hello",
      exampleLang: "en",
      image: "data:image/png;base64,AA",
    });
  });

  it("takes an example together with its language", () => {
    const out = migrateV1({
      cards: [
        card({ id: "kept", pack: "food", front: "bread", back: "le pain", example: "Du pain.", createdAt: 1 }),
        card({ id: "drop", pack: "food", front: "bread", back: "le pain", example: "Bread.", exampleLang: "en", createdAt: 2 }),
      ],
    });
    expect(out.cards[0].example).toBe("Du pain.");
    expect(out.cards[0].exampleLang).toBeUndefined();
  });

  it("skips cards that are not objects or lack their words or languages", () => {
    const out = migrateV1({
      cards: [
        null,
        "cat",
        42,
        card({ id: "ok", front: "cat", back: "chat" }),
        card({ id: "noFront", back: "chat" }),
        card({ id: "noBack", front: "cat" }),
        card({ id: "numFront", front: 7, back: "chat" }),
        card({ id: "noSrc", front: "cat", back: "chat", src: undefined }),
        card({ id: "noTgt", front: "cat", back: "chat", tgt: null }),
      ],
    });
    expect(out.cards.map((c) => c.id)).toEqual(["ok"]);
  });

  it("keeps tags only when they are a list", () => {
    const out = migrateV1({
      decks,
      cards: [
        card({ id: "str", front: "cat", back: "chat", tags: "pets", deckId: "none" }),
        card({ id: "strOwn", front: "dog", back: "chien", tags: "pets", deckId: "d1" }),
        card({ id: "mixed", front: "cow", back: "vache", tags: ["farm", 3, null], deckId: "none" }),
      ],
    });
    expect(byId(out.cards, "str").tags).toBeUndefined();
    expect(byId(out.cards, "strOwn").tags).toEqual(["Pets"]);
    expect(byId(out.cards, "mixed").tags).toEqual(["farm"]);
  });

  it("treats cards, lists and reviews that are not lists as empty", () => {
    const out = migrateV1({ cards: { a: 1 }, decks: "Pets", reviews: { b: 2 } } as unknown as V1Data);
    expect(out.cards).toEqual([]);
    expect(out.reviews).toEqual([]);

    const withCards = migrateV1({ decks: { d1: "Pets" }, cards: [card({ id: "x", front: "cat", back: "chat" })] } as unknown as V1Data);
    expect(withCards.cards.map((c) => c.id)).toEqual(["x"]);
  });

  it("keeps a card with no valid review state, as a new word", async () => {
    const out = migrateV1(
      {
        cards: [
          card({ id: "none", front: "cat", back: "chat", srs: undefined }),
          card({ id: "bad", front: "dog", back: "chien", srs: { state: "x" } }),
        ],
      },
      5000,
    );
    expect(out.cards.map((c) => c.id)).toEqual(["none", "bad"]);
    for (const c of out.cards) {
      expect(c.srs.state).toBe(0);
      expect(c.srs.cardId).toBe(c.id);
      expect(new Date(c.srs.dueAt).getTime()).toBe(5000);
      expect(Object.keys(c.srs).sort()).toEqual(Object.keys(await newSrsCard()).sort());
    }
  });

  it("flips a started card with no review state without throwing", () => {
    const out = migrateV1(
      {
        cards: [
          card({ id: "f", src: "fr", tgt: "en", front: "chat", back: "cat", srs: undefined, introducedAt: 1500 }),
          card({ id: "g", src: "fr", tgt: "en", front: "chien", back: "dog", srs: S1, srsReverse: { nope: 1 } }),
        ],
      },
      5000,
    );
    const f = byId(out.cards, "f");
    expect(f).toMatchObject({ front: "cat", back: "chat", src: "en", tgt: "fr" });
    expect(f.srs.state).toBe(0);
    expect(f.srs.cardId).toBe("f-f");
    expect(f.srsReverse?.state).toBe(0);
    // A broken reverse state is not used as the new forward one.
    const g = byId(out.cards, "g");
    expect(g.srs.state).toBe(0);
    expect(g.srs.cardId).toBe("s1-f");
    expect(g.srsReverse).toEqual(S1);
  });

  it("drops reviews that are not objects", () => {
    const out = migrateV1({ cards: [card({ id: "a", front: "cat", back: "chat" })], reviews: [null, 3, "x", review("a")] });
    expect(out.reviews).toEqual([review("a")]);
  });
});

describe("sameWordKey", () => {
  it("names a ready-made word by its list and English word, and an own word by both sides", () => {
    expect(sameWordKey({ pack: "food", front: "bread", back: "le pain", src: "en", tgt: "fr" })).toBe("en>fr|food|bread");
    expect(sameWordKey({ front: "Cat", back: "Chat", src: "en", tgt: "fr" })).toBe("en>fr|own|cat|chat");
  });
});

describe("mergeLateV1", () => {
  const moved = 10_000;
  const base = (): V1Data => ({
    decks,
    cards: [card({ id: "fc", src: "fr", tgt: "en", front: "chat", back: "cat", srs: S1 })],
    reviews: [review("fc", { reviewedAt: 1000, direction: "forward" })],
    rewards,
  });
  // What the store's move saves: the moved data with the late merge's mark.
  const move = (raw: V1Data) => ({ ...migrateV1(raw, moved), lateV1Through: moved, lateV1Seen: lateV1Seen(raw, moved) });

  it("adds nothing when the old tab saved nothing new", () => {
    const v2 = move(base());
    expect(mergeLateV1(v2, base(), moved)).toBeNull();
  });

  it("relabels a turned word's new review and takes its newer state", () => {
    const v2 = move(base());
    const newer = srs({ ...S1, reps: 9, lastReviewAt: "2026-11-07T00:00:00.000Z" });
    const raw = base();
    raw.cards = [{ ...(raw.cards![0] as object), srs: newer }];
    raw.reviews = [...raw.reviews!, review("fc", { reviewedAt: moved + 1, direction: "forward" })];
    const out = mergeLateV1(v2, raw, moved)!;
    // The old forward (French → English) is now the reverse.
    expect(out.reviews.at(-1)!.direction).toBe("reverse");
    expect(out.cards[0].srsReverse).toEqual(newer);
    expect(out.cards[0].srs).toEqual(v2.cards[0].srs);
    expect(mergeLateV1(out, raw, moved)).toBeNull();
  });

  it("adds a late word once, raises the mark, and does not add it again once deleted", () => {
    const v2 = move(base());
    const raw = base();
    raw.cards = [...raw.cards!, card({ id: "late", front: "dog", back: "chien", createdAt: moved + 5 })];
    const out = mergeLateV1(v2, raw, moved)!;
    expect(out.cards.map((c) => c.id)).toEqual(["fc", "late"]);
    expect(out.lateV1Through).toBe(moved + 5);
    expect(out.lateV1Seen).toEqual({ fc: 1000, late: moved + 5 });
    const deleted = { ...out, cards: out.cards.filter((c) => c.id !== "late") };
    expect(mergeLateV1(deleted, raw, moved)).toBeNull();
  });

  it("never takes an older state", () => {
    const v2 = move(base());
    const raw = base();
    raw.cards = [{ ...(raw.cards![0] as object), srs: srs({ ...S1, reps: 1, lastReviewAt: "2020-01-01T00:00:00.000Z" }) }];
    expect(mergeLateV1(v2, raw, moved)).toBeNull();
  });

  it("adds badges, goal days and quizzes the old tab earned", () => {
    const v2 = move(base());
    const raw = { ...base(), rewards: { badges: { first: 1, late: 99 }, goalDays: ["2026-11-07"], perfectQuizzes: 5 } };
    const out = mergeLateV1(v2, raw, moved)!;
    expect(out.rewards).toEqual({
      badges: { first: 123, late: 99 },
      goalDays: ["2026-01-30", "2026-11-07"],
      perfectQuizzes: 5,
    });
  });
});
