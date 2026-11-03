import { describe, expect, it } from "vitest";
import { Rating, State } from "../srs";
import { dayKey } from "../stats";
import { addCards, dueCount, dueReviews, gradeCard, INTRO_DELAY, isDue, itemsOf, newStartedOn, newWords, setNewPerDay } from "../store";

// The store runs in memory here: there is no localStorage in Node.

describe("study scheduling", () => {
  it("keeps added words in order and caps new words per day", async () => {
    const made = await addCards(
      "deck",
      "en",
      "fr",
      ["hello", "thank you", "please"].map((w) => ({ front: w, back: w })),
    );
    expect(newWords(made).map((c) => c.front)).toEqual(["hello", "thank you", "please"]);
    setNewPerDay(2);
    const today = dayKey(new Date());
    expect(dueCount({ cards: made, reviews: [], settings: { dailyGoal: 20, newPerDay: 2 } }, today)).toBe(2);
    expect(
      dueCount(
        { cards: made, reviews: [{ cardId: "x", rating: 3, reviewedAt: 0, day: today, wasNew: true }], settings: { dailyGoal: 20, newPerDay: 2 } },
        today,
      ),
    ).toBe(1);
  });

  it("starts the reverse direction tomorrow once a word is known", async () => {
    const [card] = await addCards("deck", "en", "fr", [{ front: "cat", back: "chat" }]);
    expect(itemsOf(card)).toHaveLength(1);
    const known = await gradeCard(card, Rating.Good);
    expect(known.srs.state).toBe(State.Review);
    expect(known.srsReverse).toBeDefined();
    const due = new Date(known.srsReverse!.dueAt);
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    expect(due.getTime()).toBe(tomorrow.getTime());
    expect(itemsOf(known).map((i) => i.dir)).toEqual(["forward", "reverse"]);
  });

  it("counts a first review of a new word against the daily limit", () => {
    const today = dayKey(new Date());
    expect(
      newStartedOn(
        [
          { cardId: "a", rating: 1, reviewedAt: 0, day: today, wasNew: true, intro: true },
          { cardId: "b", rating: 3, reviewedAt: 0, day: today },
        ],
        today,
      ),
    ).toBe(1);
  });

  it("doesn't rate a first look, and asks the word a minute later", async () => {
    const [card] = await addCards("deck", "en", "fr", [{ front: "dog", back: "chien" }]);
    const seen = await gradeCard(card, Rating.Again, "forward", { intro: true });
    expect(seen.srs).toEqual(card.srs);
    expect(seen.srs.state).toBe(State.New);
    expect(newWords([seen])).toHaveLength(0);
    const [item] = itemsOf(seen);
    expect(item.waitUntil).toBe(seen.introducedAt! + INTRO_DELAY);
    expect(isDue(item, seen.introducedAt! + 1000)).toBe(false);
    expect(isDue(item, seen.introducedAt! + INTRO_DELAY)).toBe(true);
    expect(dueReviews([seen], null, seen.introducedAt! + INTRO_DELAY)).toHaveLength(1);
  });
});
