import { describe, expect, it } from "vitest";
import {
  OVERLAY_KEY,
  clampScene,
  headlineSize,
  openTrail,
  overlayDepth,
  overlayState,
  partOfSpeech,
  pushTrail,
  trailWord,
  stepFor,
  trailAt,
  withoutOverlay,
} from "../word/stage";

describe("stepFor", () => {
  it("moves forward with the right arrow, backward in right to left", () => {
    expect(stepFor("ArrowRight", false)).toBe(1);
    expect(stepFor("ArrowRight", true)).toBe(-1);
  });

  it("moves backward with the left arrow, forward in right to left", () => {
    expect(stepFor("ArrowLeft", false)).toBe(-1);
    expect(stepFor("ArrowLeft", true)).toBe(1);
  });

  it("ignores other keys", () => {
    expect(stepFor("Enter", false)).toBe(0);
    expect(stepFor("ArrowUp", true)).toBe(0);
  });
});

describe("clampScene", () => {
  it("keeps the index between the first and the last scene", () => {
    expect(clampScene(-1, 4)).toBe(0);
    expect(clampScene(4, 4)).toBe(3);
    expect(clampScene(2, 4)).toBe(2);
  });

  it("stays at 0 when there are no scenes", () => {
    expect(clampScene(3, 0)).toBe(0);
  });
});

describe("partOfSpeech", () => {
  it("knows the common word types, whatever their case", () => {
    expect(partOfSpeech("noun")).toBe("noun");
    expect(partOfSpeech(" Verb ")).toBe("verb");
    expect(partOfSpeech("interjection")).toBe("interjection");
  });

  it("gives null for anything else", () => {
    expect(partOfSpeech("proper noun")).toBeNull();
    expect(partOfSpeech("")).toBeNull();
    expect(partOfSpeech("constructor")).toBeNull();
  });
});

describe("overlay history", () => {
  it("reads how many word pages are open at an entry", () => {
    expect(overlayDepth(null)).toBe(0);
    expect(overlayDepth({ __NA: true })).toBe(0);
    expect(overlayDepth({ [OVERLAY_KEY]: 2 })).toBe(2);
    expect(overlayDepth({ [OVERLAY_KEY]: "2" })).toBe(0);
    expect(overlayDepth({ [OVERLAY_KEY]: -1 })).toBe(0);
  });

  it("keeps what is already in the state (Next.js's own) and sets the depth", () => {
    const next = { __NA: true, tree: [1] };
    expect(overlayState(next, 1)).toEqual({ __NA: true, tree: [1], [OVERLAY_KEY]: 1 });
    expect(overlayState(null, 3)).toEqual({ [OVERLAY_KEY]: 3 });
    expect(next).toEqual({ __NA: true, tree: [1] });
  });

  it("drops the depth from a state", () => {
    expect(withoutOverlay({ __NA: true, [OVERLAY_KEY]: 2 })).toEqual({ __NA: true });
    expect(withoutOverlay(null)).toEqual({});
  });
});

describe("trail", () => {
  it("opens on one word", () => {
    expect(openTrail("bread")).toEqual({ words: ["bread"], depth: 1 });
  });

  it("adds a word after the one on screen, dropping the ones gone back from", () => {
    const t = pushTrail(pushTrail(openTrail("bread"), "crumbs"), "toast");
    expect(t).toEqual({ words: ["bread", "crumbs", "toast"], depth: 3 });
    expect(pushTrail(trailAt(t, 1), "butter")).toEqual({ words: ["bread", "butter"], depth: 2 });
  });

  it("goes back and forward within the words it has", () => {
    const t = pushTrail(openTrail("bread"), "crumbs");
    expect(trailAt(t, 1)).toEqual({ words: ["bread", "crumbs"], depth: 1 });
    expect(trailAt(trailAt(t, 1), 2).depth).toBe(2);
    expect(trailAt(t, 5).depth).toBe(2);
    expect(trailAt(t, 0).depth).toBe(0);
  });

  it("shows the word at its depth, none when closed", () => {
    const t = pushTrail(openTrail("bread"), "crumbs");
    expect(trailWord(t)).toBe("crumbs");
    expect(trailWord(trailAt(t, 1))).toBe("bread");
    expect(trailWord(trailAt(t, 0))).toBeUndefined();
  });
});

describe("headlineSize", () => {
  it("fits the longest word on one line, in cqi", () => {
    expect(headlineSize("grandmother")).toBeCloseTo(100 / (11 * 0.62));
    expect(headlineSize("good morning")).toBe(headlineSize("morning"));
    expect(headlineSize("how are you?")).toBe(headlineSize("you?"));
  });

  it("counts characters, not UTF-16 units", () => {
    expect(headlineSize("café")).toBe(headlineSize("cafe"));
    expect(headlineSize("𝒳𝒴")).toBe(headlineSize("ab"));
  });

  it("treats an empty word as one character", () => {
    expect(headlineSize("")).toBe(headlineSize("a"));
    expect(headlineSize("  ")).toBe(headlineSize("a"));
  });
});
