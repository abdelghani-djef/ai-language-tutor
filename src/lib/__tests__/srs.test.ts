import { describe, expect, it } from "vitest";
import { formatInterval, isLearned, newSrsCard, previewIntervals, Rating, reviewSrsCard, State } from "../srs";

const t0 = new Date("2026-10-31T10:00:00Z");

describe("FSRS scheduling", () => {
  it("starts new cards due immediately", async () => {
    const c = await newSrsCard(t0);
    expect(c.state).toBe(State.New);
    expect(new Date(c.dueAt).getTime()).toBe(t0.getTime());
  });

  it("orders intervals Again < Hard < Good < Easy", async () => {
    const c = await reviewSrsCard(await newSrsCard(t0), Rating.Good, t0);
    const later = new Date(c.dueAt);
    const next = await Promise.all(
      [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((g) => reviewSrsCard(c, g, later)),
    );
    const due = next.map((n) => new Date(n.dueAt).getTime());
    expect(due[0]).toBeLessThan(due[1]);
    expect(due[1]).toBeLessThanOrEqual(due[2]);
    expect(due[2]).toBeLessThan(due[3]);
  });

  it("sends a forgotten card back to relearning", async () => {
    let c = await newSrsCard(t0);
    c = await reviewSrsCard(c, Rating.Easy, t0);
    expect(isLearned(c)).toBe(true);
    c = await reviewSrsCard(c, Rating.Again, new Date(c.dueAt));
    expect(c.state).toBe(State.Relearning);
    expect(c.lapses).toBe(1);
  });

  it("previews a label for every grade", async () => {
    const p = await previewIntervals(await newSrsCard(t0), t0);
    expect(Object.keys(p).sort()).toEqual(["1", "2", "3", "4"]);
  });

  it("formats intervals", () => {
    expect(formatInterval(60_000)).toBe("1m");
    expect(formatInterval(3 * 86_400_000)).toBe("3d");
    expect(formatInterval(400 * 86_400_000)).toBe("1.1y");
  });
});
