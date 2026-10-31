import { describe, expect, it } from "vitest";
import { countByDay, dayKey, heatmapGrid, longestStreak, studyStreak } from "../stats";

const today = new Date(2026, 9, 31, 15); // Sat 31 Oct 2026

describe("studyStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(studyStreak(["2026-10-29", "2026-10-30", "2026-10-31"], today)).toBe(3);
  });
  it("keeps yesterday's streak alive before today's first review", () => {
    expect(studyStreak(["2026-10-29", "2026-10-30"], today)).toBe(2);
  });
  it("resets after a missed day", () => {
    expect(studyStreak(["2026-10-28", "2026-10-29"], today)).toBe(0);
  });
  it("handles month boundaries and duplicates", () => {
    expect(studyStreak(["2026-11-01", "2026-10-31", "2026-10-31"], new Date(2026, 10, 1, 9))).toBe(2);
  });
});

describe("longestStreak", () => {
  it("finds the longest run", () => {
    expect(longestStreak(["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07"])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("heatmap helpers", () => {
  it("builds Sunday-first weeks ending today with future days blank", () => {
    const grid = heatmapGrid(4, today);
    expect(grid).toHaveLength(4);
    expect(grid[0][0]).toBe("2026-10-04"); // a Sunday
    expect(grid[3][6]).toBe(dayKey(today)); // Saturday is today
  });
  it("counts reviews per day", () => {
    expect(countByDay(["a", "b", "a"]).get("a")).toBe(2);
  });
});
