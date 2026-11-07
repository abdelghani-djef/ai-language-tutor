"use client";

// The ready-made lists' words, loaded on demand. They are big (see src/data/starter-words.ts),
// so they are not in any page's bundle: the first page that needs them loads them once with a
// dynamic import, and every component then shares the same rows. Pages that never show them
// (home, quiz, add…) never download them. The lists' index (titles, levels, sizes) is small and
// always there: src/data/starter-packs.ts.

import { useEffect, useSyncExternalStore } from "react";
import type { StarterWords } from "../data/starter-packs";

let loaded: StarterWords | undefined;
let loading: Promise<StarterWords> | undefined;
const listeners = new Set<() => void>();

/**
 * The words of every ready-made list. The download starts on the first call and is shared by
 * the calls after it; a failed download (say, offline) is tried again by the next call.
 */
export function loadStarterWords(): Promise<StarterWords> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= import("../data/starter-words").then(
    (m) => {
      loaded = m.STARTER_WORDS;
      for (const l of listeners) l();
      return loaded;
    },
    (err: unknown) => {
      loading = undefined;
      throw err;
    },
  );
  return loading;
}

/** The words once loadStarterWords() has resolved; undefined before. */
export function starterWordsNow(): StarterWords | undefined {
  return loaded;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const none = () => undefined;

/**
 * The ready-made lists' words, or undefined while they load (and in the static HTML). Loads them
 * unless `load` is false, so a page can wait until it needs them. Every component using it shows
 * them as soon as they arrive.
 */
export function useStarterWords(load = true): StarterWords | undefined {
  const words = useSyncExternalStore(subscribe, starterWordsNow, none);
  useEffect(() => {
    if (!load) return;
    // A failed download (say, offline) leaves the words undefined; try again when the browser is
    // back online or the page is shown again, so the page doesn't stay empty.
    const tryLoad = () => {
      if (!starterWordsNow()) loadStarterWords().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") tryLoad();
    };
    tryLoad();
    if (typeof window === "undefined") return; // tests render without a browser
    window.addEventListener("online", tryLoad);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", tryLoad);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);
  return words;
}
