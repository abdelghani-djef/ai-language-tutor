import { afterEach, describe, expect, it } from "vitest";
import { STARTER_PACKS } from "../../data/starter-packs";
import { STARTER_WORDS } from "../../data/starter-words";
import { newSrsState } from "../migrate";
import {
  inList,
  isSorted,
  knownKey,
  knownWords,
  LEVELS,
  levelOf,
  myCards,
  OWN,
  packProgress,
  sameWordIn,
  sortedPacks,
  sortQueue,
  studyCards,
  filterMyWords,
  tagsOf,
  toStored,
  validList,
} from "../mywords";
import { dueCount, newWords, returnedWords, type Data, type Flashcard, type Profile } from "../store";

const FR: Profile = { lang: "fr", setupAt: 0 };
const AR: Profile = { lang: "ar", setupAt: 0 };

let n = 0;
/** A hand-built card: English → French, New, in Should learn, unless told otherwise. */
function card(p: Partial<Flashcard> = {}): Flashcard {
  n += 1;
  return {
    id: `c${n}`,
    front: `word${n}`,
    back: `mot${n}`,
    src: "en",
    tgt: "fr",
    srs: newSrsState(`c${n}`, 0),
    createdAt: n,
    status: "learn",
    ...p,
  };
}

/** The real lists' words, as the pages pass them once loaded. */
const W = STARTER_WORDS;
const food = () => W.food;
const travel = () => W.travel;

/** Data for the sorting selectors. */
const data = (cards: Flashcard[], known: Record<string, number> = {}, profile: Profile = FR) => ({
  cards,
  known,
  profile,
});

describe("my words", () => {
  it("myCards is the current language only", () => {
    const fr = card({ tgt: "fr" });
    const ar = card({ tgt: "ar" });
    const esde = card({ src: "es", tgt: "de" });
    const frEn = card({ src: "fr", tgt: "en" });
    const cards = [fr, ar, esde, frEn];
    expect(myCards({ cards, profile: FR })).toEqual([fr]);
    expect(myCards({ cards, profile: AR })).toEqual([ar]);
    expect(myCards({ cards, profile: undefined })).toEqual([]);
  });

  it("inList: no list is every word, OWN is the learner's own words, else one list", () => {
    const own = card();
    const inFood = card({ pack: "food" });
    expect(inList(own, null)).toBe(true);
    expect(inList(inFood, undefined)).toBe(true);
    expect(inList(own, OWN)).toBe(true);
    expect(inList(inFood, OWN)).toBe(false);
    expect(inList(inFood, "food")).toBe(true);
    expect(inList(own, "food")).toBe(false);
    expect(inList(inFood, "travel")).toBe(false);
  });

  it("studyCards leaves out Already know words and filters by list", () => {
    const learnFood = card({ pack: "food" });
    const knownFood = card({ pack: "food", status: "known", knownAt: 5 });
    const learnOwn = card();
    const knownOwn = card({ status: "known", knownAt: 6 });
    const learnTravel = card({ pack: "travel" });
    const arFood = card({ pack: "food", tgt: "ar" });
    const d = { cards: [learnFood, knownFood, learnOwn, knownOwn, learnTravel, arFood], profile: FR };
    expect(studyCards(d)).toEqual([learnFood, learnOwn, learnTravel]);
    expect(studyCards(d, null)).toEqual([learnFood, learnOwn, learnTravel]);
    expect(studyCards(d, "food")).toEqual([learnFood]);
    expect(studyCards(d, OWN)).toEqual([learnOwn]);
    expect(studyCards(d, "greetings")).toEqual([]);
    expect(studyCards({ ...d, profile: undefined })).toEqual([]);
  });

  it("sortQueue follows list order and skips sorted words", () => {
    const [w0, w1, w2, w3] = food();
    const d = data(
      [
        card({ pack: "food", front: w1[0], back: w1[1], status: "learn" }),
        // Typed by the learner, in another case: the same word as the list's 3rd.
        card({ front: w2[0].toUpperCase(), back: ` ${w2[1].toUpperCase()} ` }),
        // In Arabic: says nothing about French.
        card({ pack: "food", front: w3[0], back: w3[2], tgt: "ar" }),
      ],
      { [knownKey("fr", "food", w0[0])]: 1 },
    );
    expect(isSorted(d, "food", w0[0], W)).toBe(true);
    expect(isSorted(d, "food", w1[0], W)).toBe(true);
    expect(isSorted(d, "food", w2[0], W)).toBe(true);
    expect(isSorted(d, "food", w3[0], W)).toBe(false);

    const q = sortQueue(d, ["food"], W);
    expect(q[0]).toEqual({ pack: "food", word: w3[0] });
    expect(q).toEqual(food().slice(3).map((r) => ({ pack: "food", word: r[0] })));

    expect(sortQueue(d, ["food", "travel"], W)).toEqual([
      ...food().slice(3).map((r) => ({ pack: "food", word: r[0] })),
      ...travel().map((r) => ({ pack: "travel", word: r[0] })),
    ]);
    // Travel first when asked first; unknown ids are dropped.
    expect(sortQueue(d, ["travel", "nope", "food"], W)[0]).toEqual({ pack: "travel", word: travel()[0][0] });
    // No profile: nothing is sorted, nothing to sort into.
    expect(sortQueue({ cards: [], known: {}, profile: undefined }, ["food"], W)).toEqual([]);
  });

  it("a known key in Arabic doesn't sort the word in French", () => {
    const w0 = food()[0][0];
    const d = data([], { [knownKey("ar", "food", w0)]: 1 });
    expect(isSorted(d, "food", w0, W)).toBe(false);
    expect(isSorted({ ...d, profile: AR }, "food", w0, W)).toBe(true);
  });

  it("two lists can hold the same English word", () => {
    expect(W.describe.some((r) => r[0] === "right")).toBe(true);
    expect(W.position.some((r) => r[0] === "right")).toBe(true);

    const byKey = data([], { [knownKey("fr", "describe", "right")]: 1 });
    expect(isSorted(byKey, "describe", "right", W)).toBe(true);
    expect(isSorted(byKey, "position", "right", W)).toBe(false);
    expect(sortQueue(byKey, ["position"], W).some((w) => w.word === "right")).toBe(true);

    const byCard = data([card({ pack: "describe", front: "right", back: "correct" })]);
    expect(isSorted(byCard, "describe", "right", W)).toBe(true);
    expect(isSorted(byCard, "position", "right", W)).toBe(false);

    // An own "right" / "correct" is describe's word, not position's ("à droite").
    const byOwn = data([card({ front: "Right", back: "Correct" })]);
    expect(isSorted(byOwn, "describe", "right", W)).toBe(true);
    expect(isSorted(byOwn, "position", "right", W)).toBe(false);
  });

  it("packProgress counts each part", () => {
    const [w0, w1, w2, w3, w4, w5] = food();
    const d = data(
      [
        card({ pack: "food", front: w1[0], back: w1[1] }),
        card({ pack: "food", front: w2[0], back: w2[1], status: "known", knownAt: 3 }),
        card({ front: w3[0], back: w3[1] }), // own, learn
        card({ front: w4[0], back: w4[1], status: "known", knownAt: 4 }), // own, known
        card({ pack: "food", front: w5[0], back: w5[2], tgt: "ar" }), // other language
      ],
      { [knownKey("fr", "food", w0[0])]: 1, [knownKey("ar", "food", w5[0])]: 1 },
    );
    const total = food().length;
    expect(packProgress(d, "food", W)).toEqual({ total, known: 3, learn: 2, left: total - 5 });
    expect(packProgress(d, "travel", W)).toEqual({ total: travel().length, known: 0, learn: 0, left: travel().length });
    expect(packProgress(d, "nope", W)).toEqual({ total: 0, known: 0, learn: 0, left: 0 });
  });

  it("sortedPacks is the lists with at least one sorted word in the current language", () => {
    const d = data(
      [card({ pack: "travel", front: travel()[0][0], back: travel()[0][1] }), card({ pack: "describe", tgt: "ar" })],
      { [knownKey("fr", "food", food()[0][0])]: 1, [knownKey("ar", "position", "right")]: 1 },
    );
    expect(sortedPacks(d, W)).toEqual(new Set(["food", "travel"]));
    expect(sortedPacks({ ...d, profile: undefined }, W)).toEqual(new Set());
  });

  it("reads ready-made words only from the words it is given", () => {
    const w0 = food()[0];
    const d = data([card({ front: w0[0], back: w0[1] })], { [knownKey("fr", "food", "zzz")]: 1 });
    const mine = { food: [w0, ["zzz", "zzz-fr", "زززز", "", "zzz"]] } as const satisfies typeof W;
    expect(sortQueue(d, ["food"], {})).toEqual([]);
    expect(packProgress(d, "food", {})).toEqual({ total: 0, known: 0, learn: 0, left: 0 });
    expect(packProgress(d, "food", mine)).toEqual({ total: 2, known: 1, learn: 1, left: 0 });
    expect(sortedPacks(d, mine)).toEqual(new Set(["food"]));
    expect(knownWords(d, mine).map((e) => e.word)).toEqual(["zzz"]);
    // An id every object has is not a list.
    expect(sortQueue(d, ["constructor", "__proto__"], W)).toEqual([]);
    expect(isSorted(d, "constructor", "zzz", W)).toBe(false);
  });

  it("knownWords lists known keys and known cards, newest first", () => {
    const [w0, w1] = food();
    const knownCard = card({ pack: "food", front: w1[0], back: w1[1], emoji: w1[3], status: "known", knownAt: 30 });
    const ownKnown = card({ front: "kettle", back: "la bouilloire", status: "known", knownAt: 10 });
    const arKnown = card({ front: "kettle", back: "الغلاية", status: "known", tgt: "ar", knownAt: 99 });
    const d = data(
      [knownCard, ownKnown, card({ pack: "food", front: food()[2][0] }), arKnown],
      {
        [knownKey("fr", "food", w0[0])]: 20,
        // The card speaks for this word: no second entry.
        [knownKey("fr", "food", w1[0])]: 40,
        [knownKey("ar", "food", w0[0])]: 50,
      },
    );
    expect(knownWords(d, W)).toEqual([
      { pack: "food", word: w1[0], translation: w1[1], emoji: w1[3], card: knownCard, at: 30 },
      { pack: "food", word: w0[0], translation: w0[1], emoji: w0[3] || undefined, at: 20 },
      { pack: undefined, word: "kettle", translation: "la bouilloire", emoji: undefined, card: ownKnown, at: 10 },
    ]);
    expect(knownWords({ ...d, profile: AR }, W)).toEqual([
      { pack: undefined, word: "kettle", translation: "الغلاية", emoji: undefined, card: arKnown, at: 99 },
      { pack: "food", word: w0[0], translation: w0[2], emoji: w0[3] || undefined, at: 50 },
    ]);
  });
});

describe("adding own words", () => {
  it("toStored puts English first, whichever field was typed in", () => {
    expect(toStored("en", " cat ", "chat ")).toEqual({ front: "cat", back: "chat" });
    expect(toStored("fr", "chat", "cat")).toEqual({ front: "cat", back: "chat" });
    expect(toStored("ar", "قطة", "cat")).toEqual({ front: "cat", back: "قطة" });
  });

  it("sameWordIn finds a word already in My words, in the current language only", () => {
    const cat = card({ front: "Cat", back: "Chat" });
    const arDog = card({ front: "dog", back: "كلب", tgt: "ar" });
    const d = { cards: [cat, arDog], profile: FR };
    expect(sameWordIn(d, "cat", " chat")).toBe(cat);
    expect(sameWordIn(d, "cat", "le chat")).toBeUndefined();
    expect(sameWordIn(d, "dog", "كلب")).toBeUndefined();
    expect(sameWordIn({ ...d, profile: AR }, "DOG", "كلب")).toBe(arDog);
  });
});

describe("filtering My words", () => {
  const w = food()[0];
  const own = card({ front: "Kettle", back: "la bouilloire", tags: ["Kitchen"], notes: "masculine" });
  const fromFood = card({ pack: "food", front: "bread", back: "le pain", tags: ["kitchen", "daily"] });
  const keyEntry = { pack: "food", word: w[0], translation: w[1], at: 1 };
  const ownKnown = card({ front: "sun", back: "le soleil", status: "known" });
  const known = [keyEntry, { word: "sun", translation: "le soleil", card: ownKnown, at: 2 }];

  it("tagsOf counts tags once ignoring case, most used first, in a list", () => {
    expect(tagsOf([own, fromFood], null)).toEqual([
      { tag: "Kitchen", n: 2 },
      { tag: "daily", n: 1 },
    ]);
    expect(tagsOf([own, fromFood], OWN)).toEqual([{ tag: "Kitchen", n: 1 }]);
  });

  it("filters by list, tag and search; a word known without a card has no tags", () => {
    const all = { list: null, tag: null, query: "" };
    expect(filterMyWords([own, fromFood], known, all)).toEqual({ learn: [own, fromFood], known });
    expect(filterMyWords([own, fromFood], known, { ...all, list: OWN })).toEqual({ learn: [own], known: [known[1]] });
    expect(filterMyWords([own, fromFood], known, { ...all, list: "food" })).toEqual({ learn: [fromFood], known: [keyEntry] });
    expect(filterMyWords([own, fromFood], known, { ...all, tag: "KITCHEN" })).toEqual({ learn: [own, fromFood], known: [] });
    expect(filterMyWords([own, fromFood], known, { ...all, query: " MASC" }).learn).toEqual([own]);
    expect(filterMyWords([own, fromFood], known, { ...all, query: w[1].toUpperCase() }).known).toEqual([keyEntry]);
  });
});

describe("level", () => {
  const ADV = "test-advanced";
  afterEach(() => {
    const i = STARTER_PACKS.findIndex((p) => p.id === ADV);
    if (i >= 0) STARTER_PACKS.splice(i, 1);
  });

  const keys = (lang: "fr" | "ar", packId: string, count: number) =>
    Object.fromEntries(Array.from({ length: count }, (_, i) => [knownKey(lang, packId, `w${i}`), i]));

  it("has the thresholds in one constant", () => {
    expect(LEVELS).toEqual([
      { id: "starter", min: 0 },
      { id: "a1", min: 100 },
      { id: "a2", min: 400 },
      { id: "b1", min: 1000 },
      { id: "b2", min: 2000 },
    ]);
  });

  it("levelOf", () => {
    const starter = levelOf(data([], keys("fr", "food", 99)), W);
    expect(starter.id).toBe("starter");
    expect(starter.points).toBe(99);
    expect(starter.next).toEqual({ id: "a1", min: 100 });

    const a1 = levelOf(data([], keys("fr", "food", 100)), W);
    expect(a1).toEqual({ id: "a1", points: 100, next: { id: "a2", min: 400 } });

    STARTER_PACKS.push({ id: ADV, emoji: "🎓", title: { en: "Adv", fr: "Adv", ar: "Adv" }, level: "advanced", size: 0 });
    expect(levelOf(data([], keys("fr", ADV, 50)), W)).toMatchObject({ id: "a1", points: 100 });

    // Known keys in Arabic don't count while the profile is French.
    expect(levelOf(data([], keys("ar", "food", 500)), W)).toMatchObject({ id: "starter", points: 0 });
    expect(levelOf(data([], keys("ar", "food", 500), AR), W)).toMatchObject({ id: "a2", points: 500 });

    // Known cards count too: own → 1, regular list → 1, advanced list → 2. Should learn cards don't.
    const cards = [
      card({ status: "known" }),
      card({ pack: "food", status: "known" }),
      card({ pack: ADV, status: "known" }),
      card({ pack: ADV, status: "learn" }),
      card({ pack: ADV, status: "known", tgt: "ar" }),
    ];
    expect(levelOf(data(cards), W).points).toBe(4);

    const top = levelOf(data([], keys("fr", "food", 2500)), W);
    expect(top.id).toBe("b2");
    expect(top.next).toBeUndefined();
    expect(levelOf(data([]), W).points).toBe(0);
    expect(levelOf({ cards: [], known: {}, profile: undefined }, W)).toMatchObject({ id: "starter", points: 0 });
  });

  it("a word with both a known key and a card counts once", () => {
    const w = food()[0];
    const d = data([card({ pack: "food", front: w[0], back: w[1], status: "known" })], { [knownKey("fr", "food", w[0])]: 1 });
    expect(levelOf(d, W).points).toBe(1);
  });

  it("a known key and an own card for the same word: the card stands for it, once", () => {
    const w = food()[0];
    const key = { [knownKey("fr", "food", w[0])]: 1 };
    const ownKnown = card({ front: w[0].toUpperCase(), back: w[1], status: "known", knownAt: 2 });
    const d = data([ownKnown], key);
    expect(levelOf(d, W).points).toBe(1);
    expect(knownWords(d, W).map((e) => e.card)).toEqual([ownKnown]);

    const ownLearn = card({ front: w[0], back: w[1] });
    const l = data([ownLearn], key);
    expect(levelOf(l, W).points).toBe(0);
    expect(knownWords(l, W)).toEqual([]);
    expect(packProgress(l, "food", W)).toMatchObject({ known: 0, learn: 1 });
  });
});

describe("new and returned words", () => {
  it("newWords leaves out returned words; returnedWords has them, oldest return first", () => {
    const a = card({ createdAt: 2 });
    const b = card({ createdAt: 1 });
    const r1 = card({ createdAt: 0, returnedAt: 20 });
    const r2 = card({ createdAt: 5, returnedAt: 10 });
    const seen = card({ returnedAt: 5, introducedAt: 7 });
    expect(newWords([a, b, r1, r2, seen])).toEqual([b, a]);
    expect(returnedWords([a, b, r1, r2, seen])).toEqual([r2, r1]);
  });

  it("dueCount counts only the current language and lets returned words through", () => {
    const today = "2026-11-06";
    const base: Pick<Data, "cards" | "reviews" | "settings" | "profile"> = {
      cards: [card({ pack: "food" }), card(), card({ returnedAt: 10 }), card({ status: "known" })],
      reviews: [],
      settings: { dailyGoal: 20, newPerDay: 1 },
      profile: FR,
    };
    expect(dueCount(base, today)).toBe(2);
    expect(dueCount({ ...base, cards: [...base.cards, card({ tgt: "ar" })] }, today)).toBe(2);
    // A list narrows it: food has one new word, own words have a new and a returned one.
    expect(dueCount(base, today, "food")).toBe(1);
    expect(dueCount(base, today, OWN)).toBe(2);
    // Today's limit used up: only the returned word is left.
    expect(dueCount({ ...base, reviews: [{ cardId: "x", rating: 3, reviewedAt: 0, day: today, wasNew: true }] }, today)).toBe(1);
    expect(dueCount({ ...base, profile: undefined }, today)).toBe(0);
  });
});

describe("validList", () => {
  it("keeps own words and ready-made list ids, and drops anything else", () => {
    const id = STARTER_PACKS[0].id;
    expect(validList(id)).toBe(id);
    expect(validList(OWN)).toBe(OWN);
    expect(validList("deck-123")).toBeNull();
    expect(validList("")).toBeNull();
    expect(validList(null)).toBeNull();
    expect(validList(undefined)).toBeNull();
  });
});
