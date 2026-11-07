import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STARTER_WORDS } from "../../data/starter-words";

// The loader keeps the loaded words in module state, so each test gets a fresh copy of it.
// There is no DOM here: the hook runs with React's two hooks stood in for, which is all it uses.

type Store = { subscribe: (cb: () => void) => () => void; get: () => unknown; server: () => unknown };
let store: Store | undefined;
let effects: (() => void)[] = [];

beforeEach(() => {
  vi.resetModules();
  store = undefined;
  effects = [];
  vi.doMock("react", () => ({
    useSyncExternalStore: (subscribe: Store["subscribe"], get: Store["get"], server: Store["server"]) => {
      store = { subscribe, get, server };
      return get();
    },
    useEffect: (fn: () => void) => void effects.push(fn),
  }));
});

afterEach(() => {
  vi.doUnmock("react");
  vi.doUnmock("../../data/starter-words");
});

const loader = () => import("../starter-words");

describe("loadStarterWords", () => {
  it("loads the real rows once and shares them", async () => {
    const { loadStarterWords, starterWordsNow } = await loader();
    expect(starterWordsNow()).toBeUndefined();
    const first = loadStarterWords();
    // A second call while the first is on its way waits for the same download.
    expect(loadStarterWords()).toBe(first);
    const words = await first;
    expect(words).toStrictEqual(STARTER_WORDS);
    expect(starterWordsNow()).toBe(words);
    expect(await loadStarterWords()).toBe(words);
  });

  it("tries again after a failed download", async () => {
    let calls = 0;
    vi.doMock("../../data/starter-words", () => {
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return { STARTER_WORDS: { food: [] } };
    });
    const { loadStarterWords, starterWordsNow } = await loader();
    await expect(loadStarterWords()).rejects.toThrow();
    expect(starterWordsNow()).toBeUndefined();
    expect(await loadStarterWords()).toEqual({ food: [] });
    expect(starterWordsNow()).toEqual({ food: [] });
  });
});

describe("useStarterWords", () => {
  it("is undefined until the words are here, then the words, for every component", async () => {
    const { useStarterWords } = await loader();
    expect(useStarterWords()).toBeUndefined();
    // Never in the static HTML, even once loaded in this tab.
    expect(store!.server()).toBeUndefined();

    const changed = vi.fn();
    const unsubscribe = store!.subscribe(changed);
    const other = vi.fn();
    store!.subscribe(other);
    // The effect starts the download.
    effects.forEach((fn) => fn());
    await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
    expect(other).toHaveBeenCalledTimes(1);
    expect(store!.get()).toStrictEqual(STARTER_WORDS);
    expect(useStarterWords()).toStrictEqual(STARTER_WORDS);
    expect(store!.server()).toBeUndefined();
    unsubscribe();
  });

  it("waits to load until asked", async () => {
    const { starterWordsNow, useStarterWords } = await loader();
    expect(useStarterWords(false)).toBeUndefined();
    effects.forEach((fn) => fn());
    await new Promise((r) => setTimeout(r, 10));
    expect(starterWordsNow()).toBeUndefined();

    effects = [];
    expect(useStarterWords(true)).toBeUndefined();
    effects.forEach((fn) => fn());
    await vi.waitFor(() => expect(starterWordsNow()).toStrictEqual(STARTER_WORDS));
  });
});
