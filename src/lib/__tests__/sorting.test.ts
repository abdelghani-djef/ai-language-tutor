import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STARTER_WORDS } from "../../data/starter-words";
import { isSorted, knownKey } from "../mywords";
import { newSrsCard, Rating, reviewSrsCard, State, type SrsCard } from "../srs";
import { dayKey } from "../stats";
import {
  __resetForTests,
  deleteCard,
  dueCount,
  dueTime,
  exportData,
  GRADUATE_DAYS,
  gradeCard,
  isLearnedWell,
  itemsOf,
  learnKnownWord,
  newWords,
  restoreCard,
  returnedWords,
  setProfile,
  setStatus,
  sortWord,
  unsortWord,
  type Data,
  type Flashcard,
} from "../store";

// The store runs in memory here: there is no window or localStorage in Node.

const DAY = 86_400_000;
const [W1, W2, W3] = STARTER_WORDS.food;

/** The saved data, as JSON (review-state dates are strings). */
const snap = (): Data => JSON.parse(exportData());

/** A card from `snap()` with its review-state dates as Dates again, ready to grade. */
function live(c: Flashcard): Flashcard {
  const dates = (s: SrsCard): SrsCard => ({
    ...s,
    dueAt: new Date(s.dueAt),
    lastReviewAt: s.lastReviewAt ? new Date(s.lastReviewAt) : null,
  });
  return { ...c, srs: dates(c.srs), srsReverse: c.srsReverse && dates(c.srsReverse) };
}

beforeEach(() => {
  __resetForTests();
  setProfile({ lang: "fr" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Puts `card` in the store in place of the stored card with its id. */
function replaceCard(card: Flashcard) {
  deleteCard(card.id);
  restoreCard(card);
}

/** A review state well into Review, due `daysAhead` days from now. */
async function matured(daysAhead: number): Promise<SrsCard> {
  const now = Date.now();
  let t = now - 600 * DAY;
  let c = await newSrsCard(new Date(t));
  while (new Date(c.dueAt).getTime() < now) {
    t = Math.max(t, new Date(c.dueAt).getTime());
    c = await reviewSrsCard(c, Rating.Good, new Date(t));
  }
  return { ...c, dueAt: new Date(now + daysAhead * DAY) };
}

describe("sorting ready-made words", () => {
  it("sorting writes no reviews", async () => {
    const before = snap();
    await sortWord("food", W1[0], "known");
    await sortWord("food", W2[0], "learn");
    const after = snap();
    expect(after.reviews).toEqual([]);
    expect(after.rewards).toEqual(before.rewards);
  });

  it("Should learn makes the ready-made card", async () => {
    await sortWord("food", W1[0], "learn");
    const { cards } = snap();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      front: W1[0],
      back: W1[1],
      src: "en",
      tgt: "fr",
      pack: "food",
      exampleLang: "en",
      example: W1[4],
      emoji: W1[3],
      status: "learn",
    });
    expect(cards[0].srs.state).toBe(State.New);
    expect(cards[0].returnedAt).toBeUndefined();
  });

  it("Should learn in Arabic uses the Arabic translation", async () => {
    setProfile({ lang: "ar" });
    await sortWord("food", W1[0], "learn");
    expect(snap().cards[0]).toMatchObject({ back: W1[2], tgt: "ar" });
  });

  it("Already know is a compact mark, not a card", async () => {
    await sortWord("food", W1[0], "known");
    const d = snap();
    expect(typeof d.known[knownKey("fr", "food", W1[0])]).toBe("number");
    expect(d.known[`fr:food:${W1[0]}`]).toBeTypeOf("number");
    expect(d.cards).toEqual([]);
  });

  it("sorting twice is harmless", async () => {
    await Promise.all([sortWord("food", W1[0], "learn"), sortWord("food", W1[0], "learn")]);
    expect(snap().cards).toHaveLength(1);
    await Promise.all([sortWord("food", W2[0], "known"), sortWord("food", W2[0], "learn")]);
    const d = snap();
    expect(d.cards).toHaveLength(1);
    expect(Object.keys(d.known)).toEqual([knownKey("fr", "food", W2[0])]);
  });

  it("does nothing without a profile", async () => {
    __resetForTests();
    await sortWord("food", W1[0], "learn");
    await sortWord("food", W2[0], "known");
    const d = snap();
    expect(d.cards).toEqual([]);
    expect(d.known).toEqual({});
  });

  it("undo removes what sorting made", async () => {
    await sortWord("food", W1[0], "known");
    await sortWord("food", W2[0], "learn");
    expect(isSorted(snap(), "food", W1[0], STARTER_WORDS)).toBe(true);
    expect(isSorted(snap(), "food", W2[0], STARTER_WORDS)).toBe(true);
    await unsortWord("food", W1[0]);
    await unsortWord("food", W2[0]);
    let d = snap();
    expect(isSorted(d, "food", W1[0], STARTER_WORDS)).toBe(false);
    expect(isSorted(d, "food", W2[0], STARTER_WORDS)).toBe(false);
    expect(d.known).toEqual({});
    expect(d.cards).toEqual([]);

    // A word that has been shown is studied: undo leaves it.
    await sortWord("food", W3[0], "learn");
    await gradeCard(live(snap().cards[0]), Rating.Good, "forward", { intro: true });
    await unsortWord("food", W3[0]);
    d = snap();
    expect(d.cards).toHaveLength(1);
    expect(isSorted(d, "food", W3[0], STARTER_WORDS)).toBe(true);
  });

  it("undo tapped while the card is being made removes it", async () => {
    const sorting = sortWord("food", W1[0], "learn");
    const undoing = unsortWord("food", W1[0]);
    await Promise.all([sorting, undoing]);
    const d = snap();
    expect(d.cards).toEqual([]);
    expect(isSorted(d, "food", W1[0], STARTER_WORDS)).toBe(false);
  });

  it("undo leaves a word moved back from Already know", async () => {
    await sortWord("food", W1[0], "known");
    await learnKnownWord("food", W1[0]);
    await unsortWord("food", W1[0]);
    const d = snap();
    expect(d.cards).toHaveLength(1);
    expect(d.cards[0].returnedAt).toBeTypeOf("number");
    expect(isSorted(d, "food", W1[0], STARTER_WORDS)).toBe(true);
  });

  it("a failed sort doesn't stop the next one", async () => {
    vi.spyOn(crypto, "randomUUID").mockImplementationOnce(() => {
      throw new Error("no id");
    });
    await expect(sortWord("food", W1[0], "learn")).rejects.toThrow("no id");
    expect(snap().cards).toEqual([]);
    await sortWord("food", W2[0], "learn");
    await sortWord("food", W1[0], "learn");
    expect(snap().cards.map((c) => c.front)).toEqual([W2[0], W1[0]]);
  });
});

describe("moving words between the two parts", () => {
  it("moving back to Should learn brings a studied word up today", async () => {
    await sortWord("food", W1[0], "learn");
    const shown = await gradeCard(live(snap().cards[0]), Rating.Good, "forward", { intro: true });
    expect(shown.introducedAt).toBeTypeOf("number");
    const graded = await gradeCard(shown, Rating.Good);
    expect(graded.srs.state).toBe(State.Review);
    expect(graded.srsReverse).toBeDefined();
    const before = snap();

    setStatus(graded.id, "known");
    const known = snap().cards[0];
    expect(known.status).toBe("known");
    expect(known.knownAt).toBeTypeOf("number");

    setStatus(graded.id, "learn");
    const after = snap();
    const card = after.cards[0];
    expect(card.status).toBe("learn");
    expect(card.returnedAt).toBeTypeOf("number");
    expect(card.introducedAt).toBe(graded.introducedAt);
    expect(card.srs.state).toBe(State.Review);
    for (const item of itemsOf(card)) expect(dueTime(item)).toBeLessThanOrEqual(Date.now());
    expect(after.reviews).toHaveLength(before.reviews.length);
    expect(after.rewards).toEqual(before.rewards);
  });

  it("a not-started word moved back keeps its New state", async () => {
    await sortWord("food", W1[0], "learn");
    const card = snap().cards[0];
    setStatus(card.id, "known");
    setStatus(card.id, "learn");
    const back = snap().cards[0];
    expect(back.srs).toEqual(card.srs);
    expect(back.returnedAt).toBeTypeOf("number");
    expect(snap().reviews).toEqual([]);
  });

  it("learnKnownWord says whether it moved anything", async () => {
    await sortWord("food", W1[0], "known");
    expect(await learnKnownWord("food", W1[0])).toBe(true);
    // Moved already (say, in another tab): nothing to move.
    expect(await learnKnownWord("food", W1[0])).toBe(false);
  });

  it("a returned new word skips the daily limit and doesn't use it", async () => {
    await sortWord("food", W1[0], "known");
    const before = snap();
    await learnKnownWord("food", W1[0]);
    const d = snap();
    expect(d.known).toEqual({});
    expect(d.cards).toHaveLength(1);
    const card = d.cards[0];
    expect(card).toMatchObject({ front: W1[0], back: W1[1], pack: "food", tgt: "fr", status: "learn" });
    expect(card.returnedAt).toBeTypeOf("number");
    expect(card.srs.state).toBe(State.New);
    expect(d.reviews).toEqual([]);
    expect(d.rewards).toEqual(before.rewards);

    expect(returnedWords(d.cards).map((c) => c.id)).toEqual([card.id]);
    expect(newWords(d.cards)).toEqual([]);
    // Today's limit on new words is used up, and the returned word still waits.
    const today = dayKey(new Date());
    const used = { ...d, reviews: [{ cardId: "x", rating: 3, reviewedAt: 0, day: today, wasNew: true }] };
    expect(dueCount({ ...used, settings: { ...d.settings, newPerDay: 1 } }, today)).toBe(1);

    await gradeCard(live(card), Rating.Good, "forward", { intro: true });
    const reviews = snap().reviews;
    expect(reviews).toHaveLength(1);
    expect(reviews[0].wasNew).toBeUndefined();
  });

  it("learned well moves to Already know by itself", async () => {
    expect(GRADUATE_DAYS).toBe(21);
    await sortWord("food", W1[0], "learn");
    const base = live(snap().cards[0]);
    const card: Flashcard = { ...base, srs: await matured(30), srsReverse: await matured(30), introducedAt: 1 };
    expect(card.srs.state).toBe(State.Review);
    expect(isLearnedWell(card)).toBe(true);
    expect(isLearnedWell({ ...card, srsReverse: await matured(10) })).toBe(false);
    expect(isLearnedWell({ ...card, srs: await matured(10) })).toBe(false);
    expect(isLearnedWell({ ...card, srsReverse: undefined })).toBe(false);

    // gradeCard saves the card it is given in place of the stored one with that id.
    const graded = await gradeCard(card, Rating.Good);
    expect(graded.status).toBe("known");
    expect(graded.knownAt).toBeTypeOf("number");
    expect(snap().cards[0]).toMatchObject({ status: "known" });
  });

  it("a word moved back can't graduate the same day", async () => {
    await sortWord("food", W1[0], "learn");
    const base = live(snap().cards[0]);
    replaceCard({ ...base, srs: await matured(30), srsReverse: await matured(30), introducedAt: 1 });
    setStatus(base.id, "known");
    setStatus(base.id, "learn");
    const returned = live(snap().cards[0]);
    expect(returned.returnedAt).toBeTypeOf("number");

    // Today: both directions recalled well, but it stays in Should learn.
    const forward = await gradeCard(returned, Rating.Good);
    const both = await gradeCard(forward, Rating.Good, "reverse");
    expect(isLearnedWell(both)).toBe(true);
    expect(both.status).toBe("learn");
    expect(both.knownAt).toBe(returned.knownAt);
    expect(snap().cards[0].status).toBe("learn");

    // Moved back yesterday: the same reviews graduate it.
    const yesterday = { ...returned, returnedAt: returned.returnedAt! - DAY };
    replaceCard(yesterday);
    const f2 = await gradeCard(yesterday, Rating.Good);
    expect(f2.status).toBe("learn");
    const b2 = await gradeCard(f2, Rating.Good, "reverse");
    expect(b2.status).toBe("known");
    expect(b2.knownAt).toBeGreaterThanOrEqual(returned.returnedAt!);
    expect(snap().cards[0].status).toBe("known");
  });

  it("a word not learned well enough stays in Should learn", async () => {
    await sortWord("food", W1[0], "learn");
    const graded = await gradeCard(live(snap().cards[0]), Rating.Good);
    expect(graded.status).toBe("learn");
    expect(graded.knownAt).toBeUndefined();
  });
});
