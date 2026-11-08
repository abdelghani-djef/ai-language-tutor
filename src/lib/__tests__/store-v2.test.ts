import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetForTests,
  addCard,
  deleteCard,
  exportData,
  importData,
  otherLanguageData,
  parseBackup,
  restoreCard,
  saveFailed,
  setProfile,
  subscribe,
  updateCard,
} from "../store";

const KEY = "linguacards:v2";
const OLD_KEY = "linguacards:v1";
const INVALID = "Not a valid LinguaCards backup file.";

/** A Map-backed localStorage. `failWrites` makes the next writes of a key throw, like a full storage. */
class MemoryStorage {
  map = new Map<string, string>();
  failWrites = new Map<string, number>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    const fails = this.failWrites.get(k) ?? 0;
    if (fails > 0) {
      this.failWrites.set(k, fails - 1);
      throw new Error("QuotaExceededError");
    }
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

let storage: MemoryStorage;
/** The store's "storage" event handler, from its latest load. */
let onStorage: (e: Pick<StorageEvent, "key" | "newValue">) => void;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    addEventListener(type: string, fn: typeof onStorage) {
      if (type === "storage") onStorage = fn;
    },
    removeEventListener() {},
  });
  __resetForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Saved data is JSON, so review states have their dates as strings.
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

const learned = srs({ state: 2, scheduleStatus: "review", stability: 12, difficulty: 4, reps: 3, dueAt: "2026-02-10T00:00:00.000Z" });

const v1 = {
  version: 1,
  decks: [
    { id: "d1", name: "Food", src: "en", tgt: "fr", createdAt: 1 },
    { id: "d2", name: "More food", src: "en", tgt: "fr", createdAt: 2 },
  ],
  cards: [
    { id: "c1", deckId: "d1", front: "bread", back: "le pain", src: "en", tgt: "fr", pack: "food", createdAt: 10, srs: learned },
    { id: "c2", deckId: "d2", front: "bread", back: "le pain", src: "en", tgt: "fr", pack: "food", createdAt: 20, srs: srs() },
    { id: "c3", deckId: "d1", front: "cat", back: "chat", src: "en", tgt: "fr", createdAt: 30, srs: srs() },
  ],
  reviews: [
    { cardId: "c1", rating: 3, reviewedAt: 1000, day: "2026-01-28", direction: "forward", wasNew: true },
    { cardId: "c1", rating: 3, reviewedAt: 2000, day: "2026-01-29", direction: "forward" },
    { cardId: "c2", rating: 1, reviewedAt: 3000, day: "2026-01-30" },
  ],
  settings: { dailyGoal: 20, newPerDay: 10 },
};
const v1json = JSON.stringify(v1);

const v2 = {
  version: 2,
  cards: [{ id: "v2card", front: "dog", back: "chien", src: "en", tgt: "fr", createdAt: 5, srs: srs(), status: "learn" }],
  known: { "fr:food:milk": 7 },
  reviews: [],
  settings: { dailyGoal: 20, newPerDay: 10 },
  rewards: { badges: {}, goalDays: [], perfectQuizzes: 0 },
};

function putPrefs() {
  storage.setItem("linguacards:pair", "en-fr");
  storage.setItem("linguacards:decks", "[]");
  storage.setItem("linguacards:pack-decks", "{}");
  storage.setItem("linguacards:starter-lang", "fr");
}

describe("loading", () => {
  it("moves v1 data to v2 once", () => {
    storage.setItem(OLD_KEY, v1json);
    putPrefs();
    const d = __resetForTests();
    expect(d.version).toBe(2);
    expect(d.cards.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(d.reviews).toHaveLength(3);
    const saved = storage.getItem(KEY);
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved!).version).toBe(2);
    expect(storage.getItem(OLD_KEY)).toBe(v1json);
    expect(storage.getItem("linguacards:pair")).toBeNull();
    expect(storage.getItem("linguacards:decks")).toBeNull();
    expect(storage.getItem("linguacards:pack-decks")).toBeNull();
    expect(storage.getItem("linguacards:starter-lang")).toBe("fr");

    // Opening the app again moves nothing.
    const again = __resetForTests();
    expect(storage.getItem(KEY)).toBe(saved);
    expect(again.cards.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("awards badges the moved data already qualifies for", () => {
    storage.setItem(OLD_KEY, v1json);
    const d = __resetForTests();
    expect(d.rewards.badges["first-review"]).toBeTypeOf("number");
  });

  it("prefers v2 when both exist", () => {
    storage.setItem(OLD_KEY, v1json);
    storage.setItem(KEY, JSON.stringify(v2));
    putPrefs();
    const d = __resetForTests();
    expect(d.cards.map((c) => c.id)).toEqual(["v2card"]);
    expect(d.known).toEqual({ "fr:food:milk": 7 });
    expect(storage.getItem(OLD_KEY)).toBe(v1json);
    expect(storage.getItem("linguacards:pair")).toBe("en-fr");
  });

  it("keeps the safety copy when the move does not fit, and drops it on a later save", () => {
    storage.setItem(OLD_KEY, v1json);
    putPrefs();
    storage.failWrites.set(KEY, 2);
    const d = __resetForTests();
    // The move itself never drops the copy: the app runs from memory and says so.
    expect(d.cards).toHaveLength(2);
    expect(saveFailed()).toBe(true);
    expect(storage.getItem(KEY)).toBeNull();
    expect(storage.getItem(OLD_KEY)).toBe(v1json);
    // Not moved yet, so the old preferences stay for the next try.
    expect(storage.getItem("linguacards:pair")).toBe("en-fr");

    // The next save, after that warning, makes room by dropping the copy.
    setProfile({ lang: "fr" });
    expect(saveFailed()).toBe(false);
    expect(storage.getItem(OLD_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(KEY)!).cards.map((c: { id: string }) => c.id)).toEqual(["c1", "c3"]);
  });

  it("puts the safety copy back if v2 still does not fit", () => {
    storage.setItem(OLD_KEY, v1json);
    storage.failWrites.set(KEY, 3);
    __resetForTests();
    setProfile({ lang: "fr" });
    expect(saveFailed()).toBe(true);
    expect(storage.getItem(KEY)).toBeNull();
    expect(storage.getItem(OLD_KEY)).toBe(v1json);
  });

  it("leaves everything as it was when the move fails, so it is tried again", () => {
    for (const broken of ["{not json", "null"]) {
      storage.clear();
      storage.setItem(OLD_KEY, broken);
      putPrefs();
      const d = __resetForTests();
      expect(d.cards).toEqual([]);
      expect(storage.getItem(KEY)).toBeNull();
      expect(storage.getItem(OLD_KEY)).toBe(broken);
      expect(storage.getItem("linguacards:pair")).toBe("en-fr");
    }
  });

  it("never drops the safety copy after a failed move", () => {
    storage.setItem(OLD_KEY, "{not json");
    __resetForTests();
    storage.failWrites.set(KEY, 1);
    setProfile({ lang: "fr" });
    expect(saveFailed()).toBe(true);
    expect(storage.getItem(OLD_KEY)).toBe("{not json");
  });

  it("loads the other cards when one saved card is broken", () => {
    const good = v2.cards[0];
    const { srs: _srs, ...noSrs } = { ...good, id: "noSrs" };
    void _srs;
    storage.setItem(KEY, JSON.stringify({ ...v2, cards: [good, noSrs, null, { ...good, id: "badSrs", srs: { state: 2 } }] }));
    const d = __resetForTests();
    expect(d.cards.map((c) => c.id)).toEqual(["v2card", "noSrs", "badSrs"]);
    expect(d.cards[1].srs.state).toBe(0);
    expect(d.cards[1].srs.dueAt).toBeInstanceOf(Date);
    expect(d.cards[2].srs.state).toBe(0);
  });

  it("never drops the safety copy after saved v2 failed to load", () => {
    storage.setItem(KEY, "{not json");
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    storage.failWrites.set(KEY, 1);
    setProfile({ lang: "fr" });
    expect(saveFailed()).toBe(true);
    expect(storage.getItem(OLD_KEY)).toBe(v1json);
  });

  it("cleans the status, known words and profile of saved data", () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        ...v2,
        cards: [
          { ...v2.cards[0], id: "a", status: "maybe", knownAt: "x", returnedAt: 9 },
          { ...v2.cards[0], id: "b", status: "known", knownAt: 8 },
        ],
        known: { "fr:food:milk": 7, "ar:food:bread": 8, "de:food:x": 1, "fr::x": 2, "fr:food:": 3, "fr:food:egg": "9" },
        profile: { lang: "ar", name: "  Lina \u0007 ", setupAt: 4 },
      }),
    );
    const d = __resetForTests();
    expect(d.cards[0]).toMatchObject({ status: "learn", knownAt: undefined, returnedAt: 9 });
    expect(d.cards[1]).toMatchObject({ status: "known", knownAt: 8 });
    expect(d.known).toEqual({ "fr:food:milk": 7, "ar:food:bread": 8 });
    expect(d.profile).toEqual({ lang: "ar", name: "Lina", setupAt: 4 });

    storage.setItem(KEY, JSON.stringify({ ...v2, profile: { lang: "es", setupAt: 4 } }));
    expect(__resetForTests().profile).toBeUndefined();
    storage.setItem(KEY, JSON.stringify({ ...v2, profile: { lang: "fr", setupAt: "soon" } }));
    expect(__resetForTests().profile).toBeUndefined();
  });
});

describe("backups", () => {
  it("restores a v1 backup through the move", () => {
    const d = parseBackup(v1json);
    expect(d.version).toBe(2);
    expect(d.cards.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(d.cards.every((c) => c.status === "learn")).toBe(true);
    expect(d.reviews).toEqual(v1.reviews);
    expect("decks" in d).toBe(false);
  });

  it("reads a v2 backup", () => {
    const d = parseBackup(JSON.stringify({ ...v2, profile: { lang: "fr", name: "Sam", setupAt: 3 } }));
    expect(d.cards.map((c) => c.id)).toEqual(["v2card"]);
    expect(d.known).toEqual({ "fr:food:milk": 7 });
    expect(d.profile).toEqual({ lang: "fr", name: "Sam", setupAt: 3 });
  });

  it("rejects a broken backup", () => {
    expect(() => parseBackup("{}")).toThrow(INVALID);
    expect(() => parseBackup("nope")).toThrow(INVALID);
    const { srs: _srs, ...noSrs } = v2.cards[0];
    void _srs;
    expect(() => parseBackup(JSON.stringify({ ...v2, cards: [noSrs] }))).toThrow(INVALID);
    expect(() => parseBackup(JSON.stringify({ ...v2, known: [] }))).toThrow(INVALID);
    expect(() => parseBackup(JSON.stringify({ ...v2, reviews: [{ cardId: "x" }] }))).toThrow(INVALID);
  });

  it("keeps the profile when importing a backup without one", () => {
    setProfile({ lang: "ar", name: "Lina" });
    expect(importData(parseBackup(v1json))).toBe(true);
    const d = __resetForTests();
    expect(d.profile?.name).toBe("Lina");
    expect(d.profile?.lang).toBe("ar");
    expect(d.cards.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("takes the backup's profile when it has one", () => {
    setProfile({ lang: "ar", name: "Lina" });
    importData(parseBackup(JSON.stringify({ ...v2, profile: { lang: "fr", name: "Sam", setupAt: 3 } })));
    expect(__resetForTests().profile).toEqual({ lang: "fr", name: "Sam", setupAt: 3 });
  });
});

describe("profile", () => {
  it("setProfile cleans the name and keeps setupAt", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    setProfile({ lang: "ar", name: "  Lina   B  " });
    let d = __resetForTests();
    expect(d.profile).toEqual({ lang: "ar", name: "Lina B", setupAt: 1000 });

    vi.spyOn(Date, "now").mockReturnValue(2000);
    setProfile({ lang: "fr", name: "x".repeat(40) });
    d = __resetForTests();
    expect(d.profile?.name).toBe("x".repeat(30));
    expect(d.profile?.lang).toBe("fr");
    expect(d.profile?.setupAt).toBe(1000);
  });

  it("setProfile keeps the name when none is given, and clears it when empty", () => {
    setProfile({ lang: "ar", name: "Lina" });
    setProfile({ lang: "fr" });
    expect(__resetForTests().profile).toMatchObject({ lang: "fr", name: "Lina" });
    setProfile({ lang: "fr", name: "" });
    const d = __resetForTests();
    expect(d.profile?.lang).toBe("fr");
    expect(d.profile?.name).toBeUndefined();
  });

  it("changing the language deletes the other languages' words and Already know marks", async () => {
    setProfile({ lang: "fr", name: "Sam" });
    await addCard("cat", "chat", "en", "fr");
    const qitt = await addCard("cat", "قطة", "en", "ar");
    // A word in a pair no language shows (left over from older data) goes too.
    await addCard("perro", "dog", "es", "en");
    storage.setItem(KEY, JSON.stringify({ ...JSON.parse(storage.getItem(KEY)!), known: { "fr:food:milk": 7, "ar:food:bread": 8 } }));
    let d = __resetForTests();
    expect(otherLanguageData(d, "ar")).toEqual({ words: 2, known: 1 });

    setProfile({ lang: "ar" });
    d = __resetForTests();
    expect(d.cards.map((c) => c.id)).toEqual([qitt.id]);
    expect(d.known).toEqual({ "ar:food:bread": 8 });
    expect(d.profile).toMatchObject({ lang: "ar", name: "Sam" });
    expect(otherLanguageData(d, "ar")).toEqual({ words: 0, known: 0 });
  });

  it("keeps everything when the language stays or on the first setup", async () => {
    await addCard("cat", "chat", "en", "fr");
    await addCard("cat", "قطة", "en", "ar");
    // First setup: there is no previous language, so nothing goes.
    setProfile({ lang: "fr" });
    expect(__resetForTests().cards).toHaveLength(2);
    // Saving the name with the same language deletes nothing either.
    setProfile({ lang: "fr", name: "Sam" });
    expect(__resetForTests().cards).toHaveLength(2);
  });

  it("profile changes write no reviews", () => {
    storage.setItem(OLD_KEY, v1json);
    const before = __resetForTests().reviews.length;
    setProfile({ lang: "fr", name: "Sam" });
    setProfile({ lang: "ar" });
    expect(__resetForTests().reviews).toHaveLength(before);
  });
});

describe("cards", () => {
  it("a ready-made word keeps its English word when edited", async () => {
    const own = await addCard("cat", "chat", "en", "fr");
    const ready = await addCard("bread", "le pain", "en", "fr", {}, { pack: "food" });
    updateCard(own.id, " kitty ", "minou");
    updateCard(ready.id, "bread (loaf)", "du pain");
    const [o, r] = __resetForTests().cards;
    expect([o.front, o.back]).toEqual(["kitty", "minou"]);
    expect([r.front, r.back]).toEqual(["bread", "du pain"]);
  });

  it("adds a word Should learn, and puts a deleted one back", async () => {
    const card = await addCard("cat", "chat", "en", "fr", { notes: "pet" }, { pack: "animals", exampleLang: "en" });
    expect(card).toMatchObject({ front: "cat", back: "chat", status: "learn", pack: "animals", exampleLang: "en", notes: "pet" });
    deleteCard(card.id);
    expect(__resetForTests().cards).toEqual([]);
    restoreCard(card);
    restoreCard(card);
    expect(__resetForTests().cards.map((c) => c.id)).toEqual([card.id]);
  });
});

describe("a tab still on version 1", () => {
  // What the old tab saves after the move: a new review and newer state for
  // c1, a word typed there, and a badge.
  const later = Date.now() + 5_000;
  const after = {
    ...v1,
    cards: [
      { ...v1.cards[0], srs: { ...learned, reps: 4, lastReviewAt: new Date(later).toISOString() } },
      v1.cards[1],
      v1.cards[2],
      { id: "c4", deckId: "d1", front: "dog", back: "chien", src: "en", tgt: "fr", createdAt: later, srs: srs() },
    ],
    reviews: [...v1.reviews, { cardId: "c1", rating: 3, reviewedAt: later, day: "2026-11-07", direction: "forward" }],
    rewards: { badges: { "old-tab": 42 }, goalDays: ["2026-11-07"], perfectQuizzes: 1 },
  };
  const afterJson = JSON.stringify(after);

  function check(d: ReturnType<typeof __resetForTests>) {
    expect(d.reviews).toHaveLength(4);
    expect(d.cards.map((c) => c.id)).toEqual(["c1", "c3", "c4"]);
    expect(d.cards[0].srs.reps).toBe(4);
    expect(d.cards[0].srs.lastReviewAt).toBeInstanceOf(Date);
    expect(d.cards[2].status).toBe("learn");
    expect(d.rewards.badges["old-tab"]).toBe(42);
    expect(d.rewards.goalDays).toContain("2026-11-07");
    expect(d.rewards.perfectQuizzes).toBe(1);
    expect(JSON.parse(storage.getItem(KEY)!).reviews).toHaveLength(4);
  }

  it("brings in what it saves after the move, while the app is open", () => {
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    const heard = vi.fn();
    const stop = subscribe(heard);
    storage.setItem(OLD_KEY, afterJson);
    onStorage({ key: OLD_KEY, newValue: afterJson });
    expect(heard).toHaveBeenCalledTimes(1);
    // The same save heard again adds nothing.
    onStorage({ key: OLD_KEY, newValue: afterJson });
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    check(__resetForTests());
  });

  it("brings in what it saved after the move on the next load", () => {
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    storage.setItem(OLD_KEY, afterJson);
    check(__resetForTests());
    // Loading again adds nothing more.
    check(__resetForTests());
  });

  it("does not bring back a word deleted since the move", () => {
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    deleteCard("c3");
    storage.setItem(OLD_KEY, afterJson);
    expect(__resetForTests().cards.map((c) => c.id)).toEqual(["c1", "c4"]);
  });

  it("does not bring back a late word deleted after it was merged", () => {
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    storage.setItem(OLD_KEY, afterJson);
    expect(__resetForTests().cards.map((c) => c.id)).toContain("c4");
    deleteCard("c4");
    expect(__resetForTests().cards.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(__resetForTests().cards.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("does not bring back a word made just before the move and deleted after it", () => {
    const justBefore = { id: "c5", deckId: "d1", front: "fish", back: "poisson", src: "en", tgt: "fr", createdAt: Date.now() - 30_000, srs: srs() };
    storage.setItem(OLD_KEY, JSON.stringify({ ...v1, cards: [...v1.cards, justBefore] }));
    expect(__resetForTests().cards.map((c) => c.id)).toContain("c5");
    deleteCard("c5");
    expect(__resetForTests().cards.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("still brings in a word from a second late save after a deleted one", () => {
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    storage.setItem(OLD_KEY, afterJson);
    __resetForTests();
    deleteCard("c4");
    const fish = { id: "c6", deckId: "d1", front: "fish", back: "poisson", src: "en", tgt: "fr", createdAt: later + 1_000, srs: srs() };
    const second = JSON.stringify({ ...after, cards: [...after.cards, fish] });
    storage.setItem(OLD_KEY, second);
    onStorage({ key: OLD_KEY, newValue: second });
    expect(__resetForTests().cards.map((c) => c.id)).toEqual(["c1", "c3", "c6"]);
  });

  it("brings in a word saved after the move but stamped just before it", () => {
    // A tab stamps createdAt before it saves, so a save that lands after the
    // move can carry an earlier time.
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    const slow = { id: "c7", deckId: "d1", front: "fish", back: "poisson", src: "en", tgt: "fr", createdAt: Date.now() - 1_000, srs: srs() };
    storage.setItem(OLD_KEY, JSON.stringify({ ...v1, cards: [...v1.cards, slow] }));
    expect(__resetForTests().cards.map((c) => c.id)).toEqual(["c1", "c3", "c7"]);
  });

  it("keeps the mark through a backup of version 2, and an import clears it", () => {
    storage.setItem(OLD_KEY, v1json);
    __resetForTests();
    storage.setItem(OLD_KEY, afterJson);
    __resetForTests();
    const parsed = parseBackup(exportData());
    expect(parsed.lateV1Through).toBe(later);
    expect(parsed.lateV1Seen).toEqual({ c4: later });
    importData(parsed);
    const saved = JSON.parse(storage.getItem(KEY)!);
    expect(saved.movedFromV1At).toBeUndefined();
    expect(saved.lateV1Through).toBeUndefined();
    expect(saved.lateV1Seen).toBeUndefined();
  });

  it("is not read for data that was never moved here", () => {
    storage.setItem(KEY, JSON.stringify(v2));
    storage.setItem(OLD_KEY, afterJson);
    expect(__resetForTests().cards.map((c) => c.id)).toEqual(["v2card"]);
  });
});

describe("other tabs", () => {
  it("ignores the old copy, takes new data, and passes on preferences", () => {
    storage.setItem(KEY, JSON.stringify(v2));
    __resetForTests();
    const heard = vi.fn();
    const stop = subscribe(heard);
    const cards = () => (JSON.parse(exportData()).cards as { id: string }[]).map((c) => c.id);

    onStorage({ key: OLD_KEY, newValue: v1json });
    expect(heard).not.toHaveBeenCalled();
    expect(cards()).toEqual(["v2card"]);

    onStorage({ key: "other-app", newValue: "x" });
    expect(heard).not.toHaveBeenCalled();

    onStorage({ key: KEY, newValue: JSON.stringify({ ...v2, cards: [{ ...v2.cards[0], id: "fromOtherTab" }] }) });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(cards()).toEqual(["fromOtherTab"]);

    onStorage({ key: "linguacards:engine", newValue: "nllb" });
    expect(heard).toHaveBeenCalledTimes(2);

    // Unreadable data from another tab is ignored, without throwing.
    expect(() => onStorage({ key: KEY, newValue: "{not json" })).not.toThrow();
    expect(cards()).toEqual(["fromOtherTab"]);
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
  });
});
