import { isLearned } from "./srs";
import { dayKey, longestStreak } from "./stats";
import type { Data, Rewards } from "./store";

// Daily goal and badges. Badges are worked out from the data you already have
// (reviews, streaks, learned cards) and kept once earned, so a card that
// lapses back out of "learned" doesn't take a badge away.

export const GOAL_OPTIONS = [5, 10, 20, 30, 50, 100];
export const DEFAULT_GOAL = 20;
export const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20, 30];
export const DEFAULT_NEW_PER_DAY = 10;

// Moments most people already have every day, for the if-then study plan.
export const ROUTINES = ["breakfast", "commute", "lunch", "home", "dinner", "bed"] as const;

export type Metric = "reviews" | "streak" | "learned" | "goalDays" | "perfectQuizzes";

export interface BadgeDef {
  id: string;
  icon: string;
  metric: Metric;
  target: number;
}

export const BADGES: BadgeDef[] = [
  { id: "first-review", icon: "🌱", metric: "reviews", target: 1 },
  { id: "reviews-100", icon: "💯", metric: "reviews", target: 100 },
  { id: "reviews-1000", icon: "🏔️", metric: "reviews", target: 1000 },
  { id: "streak-3", icon: "🔥", metric: "streak", target: 3 },
  { id: "streak-7", icon: "⚡", metric: "streak", target: 7 },
  { id: "streak-30", icon: "🏆", metric: "streak", target: 30 },
  { id: "learned-10", icon: "📚", metric: "learned", target: 10 },
  { id: "learned-50", icon: "🧠", metric: "learned", target: 50 },
  { id: "learned-100", icon: "🎓", metric: "learned", target: 100 },
  { id: "goal-1", icon: "🎯", metric: "goalDays", target: 1 },
  { id: "goal-7", icon: "⭐", metric: "goalDays", target: 7 },
  { id: "goal-30", icon: "🌟", metric: "goalDays", target: 30 },
  { id: "quiz-perfect", icon: "🏅", metric: "perfectQuizzes", target: 1 },
  { id: "quiz-perfect-10", icon: "👑", metric: "perfectQuizzes", target: 10 },
];

export const EMPTY_REWARDS: Rewards = { badges: {}, goalDays: [], perfectQuizzes: 0 };

/** Reviews on a day; first looks at new words aren't reviews. */
export function reviewsOn(data: Data, day: string): number {
  return data.reviews.filter((r) => r.day === day && !r.intro).length;
}

export function metrics(data: Data): Record<Metric, number> {
  return {
    reviews: data.reviews.filter((r) => !r.intro).length,
    streak: longestStreak(data.reviews.map((r) => r.day)),
    learned: data.cards.filter((c) => isLearned(c.srs)).length,
    goalDays: data.rewards.goalDays.length,
    perfectQuizzes: data.rewards.perfectQuizzes,
  };
}

export interface RewardEvent {
  /** Ids of badges earned just now. */
  badges: string[];
  /** True when this change reached today's goal for the first time. */
  goal: boolean;
}

/**
 * Records today's goal and any badges the data now qualifies for. Returns the
 * updated rewards and what is new, or null when nothing changed.
 */
export function evaluate(data: Data, now = new Date()): { rewards: Rewards; event: RewardEvent } | null {
  const today = dayKey(now);
  let { rewards } = data;
  const goal = !rewards.goalDays.includes(today) && reviewsOn(data, today) >= data.settings.dailyGoal;
  if (goal) rewards = { ...rewards, goalDays: [...rewards.goalDays, today] };

  const m = metrics({ ...data, rewards });
  const earned = BADGES.filter((b) => !(b.id in rewards.badges) && m[b.metric] >= b.target).map((b) => b.id);
  if (earned.length) {
    const at = now.getTime();
    rewards = { ...rewards, badges: { ...rewards.badges, ...Object.fromEntries(earned.map((id) => [id, at])) } };
  }
  return goal || earned.length ? { rewards, event: { badges: earned, goal } } : null;
}
