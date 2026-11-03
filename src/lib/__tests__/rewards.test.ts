import { describe, expect, it } from "vitest";
import { EMPTY_REWARDS, evaluate } from "../rewards";
import type { Data, Review } from "../store";

const now = new Date(2026, 10, 2, 15); // Mon 2 Nov 2026

function data(reviews: Review[], extra: Partial<Data> = {}): Data {
  return {
    version: 1,
    decks: [],
    cards: [],
    reviews,
    settings: { dailyGoal: 3, newPerDay: 10 },
    rewards: EMPTY_REWARDS,
    ...extra,
  };
}

const review = (day: string): Review => ({ cardId: "c", rating: 3, reviewedAt: 0, day });

describe("evaluate", () => {
  it("earns the first-review badge and nothing else for one review", () => {
    const r = evaluate(data([review("2026-11-02")]), now);
    expect(r?.event).toEqual({ badges: ["first-review"], goal: false });
    expect(r?.rewards.badges["first-review"]).toBe(now.getTime());
  });

  it("records the daily goal once, and the goal badge with it", () => {
    const d = data([review("2026-11-02"), review("2026-11-02"), review("2026-11-02")]);
    const first = evaluate(d, now);
    expect(first?.event.goal).toBe(true);
    expect(first?.rewards.goalDays).toEqual(["2026-11-02"]);
    expect(first?.event.badges).toContain("goal-1");
    // Already recorded today: nothing new.
    expect(evaluate({ ...d, reviews: [...d.reviews, review("2026-11-02")], rewards: first!.rewards }, now)).toBeNull();
  });

  it("uses the longest streak, so a broken streak keeps its badge", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03"].map(review);
    expect(evaluate(data(days), now)?.event.badges).toEqual(["first-review", "streak-3"]);
  });

  it("does not re-award badges already earned", () => {
    const rewards = { ...EMPTY_REWARDS, badges: { "first-review": 1 } };
    expect(evaluate(data([review("2026-11-01")], { rewards }), now)).toBeNull();
  });

  it("counts perfect quizzes", () => {
    const rewards = { ...EMPTY_REWARDS, badges: {}, perfectQuizzes: 1 };
    expect(evaluate(data([], { rewards }), now)?.event.badges).toEqual(["quiz-perfect"]);
  });
});
