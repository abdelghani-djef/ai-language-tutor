"use client";

import { useEffect, useState } from "react";
import type { StarterWords } from "../../data/starter-packs";
import { loadPackScenes, loadPlaces, wordScenes, type Place, type Scene } from "./scenes";
import {
  fetchArticle,
  fetchDictionary,
  fetchPartners,
  fetchSentences,
  type Article,
  type DictionaryEntry,
  type Picture,
  type Sentence,
} from "./sources";
import type { WordTarget } from "./target";

/** One section of the word page: still loading, loaded (possibly empty), or couldn't load. */
export type Section<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "failed" };

export interface WordData {
  /** Ready-made words only; ready with [] otherwise. */
  scenes: Section<{ scenes: Scene[]; places: Record<string, Place> }>;
  /** Own words (no ready-made scenes) only; ready with [] for ready-made words. */
  sentences: Section<Sentence[]>;
  dictionary: Section<DictionaryEntry | null>;
  partners: Section<string[]>;
  article: Section<Article | null>;
  /** Ready-made: the list file's pictures. Own words: the matching Wikipedia article's pictures. */
  pictures: Section<Picture[]>;
}

export interface SourcePlan {
  scenes: boolean;
  sentences: boolean;
  dictionary: boolean;
  partners: boolean;
  article: boolean;
  pictures: "pack" | "article";
}

/**
 * Which sources a word page uses. `hasScenes`: its ready-made list file has scenes for the word.
 * Ready-made words show their scenes and the list's checked pictures; other words (own words, and
 * ready-made words whose scenes aren't written yet) show Tatoeba sentences and the pictures of a
 * matching Wikipedia article. Word partners are English only; the dictionary covers every
 * language (Wiktionary). Dictionary, partners and article never depend on `hasScenes`.
 */
export function planSources(target: WordTarget, hasScenes: boolean): SourcePlan {
  const readyMade = hasScenes && target.pack !== undefined;
  return {
    scenes: readyMade,
    sentences: !readyMade,
    dictionary: true,
    partners: target.lang === "en",
    article: true,
    pictures: readyMade ? "pack" : "article",
  };
}

const LOADING: WordData = {
  scenes: { status: "loading" },
  sentences: { status: "loading" },
  dictionary: { status: "loading" },
  partners: { status: "loading" },
  article: { status: "loading" },
  pictures: { status: "loading" },
};

type DataOf<S> = S extends { status: "ready"; data: infer T } ? T : never;

const keyOf = (t: Pick<WordTarget, "word" | "lang" | "to">) => `${t.word}|${t.lang}|${t.to}`;

/** A fetch as a section: any answer, even null or [] ("nothing for this word"), is ready; a rejection is failed. */
export function sectionOf<T>(promise: Promise<T>): Promise<Section<T>> {
  return promise.then(
    (data): Section<T> => ({ status: "ready", data }),
    (): Section<T> => ({ status: "failed" }),
  );
}

/** The `sections` still loading, as failed. Sections already ready or failed are left alone. */
export function failLoading(data: WordData, sections: readonly (keyof WordData)[]): Partial<WordData> {
  const out: Partial<WordData> = {};
  for (const k of sections) if (data[k].status === "loading") out[k] = { status: "failed" };
  return out;
}

/**
 * Everything the word page shows beyond the saved word itself. All fetches start at once and each
 * section fills in on its own; results for an earlier word, or after the page closes, are dropped.
 * `words`: the lists' loaded words (word partners are checked against them).
 */
export function useWordData(target: WordTarget, words: StarterWords): WordData {
  const { word, lang, to, pack } = target;
  const key = keyOf(target);
  const [state, setState] = useState<{ key: string; data: WordData }>({ key, data: LOADING });

  // `pack` follows from `word` and `lang`, so this runs once per word|lang|to.
  useEffect(() => {
    const current = keyOf({ word, lang, to });
    const t: WordTarget = pack ? { word, lang, to, pack } : { word, lang, to };
    let live = true;
    /** Merges `change(data)` into this word's data, starting over from LOADING if another word's is shown. */
    const update = (change: (data: WordData) => Partial<WordData>) => {
      if (!live) return;
      setState((s) => {
        const data = s.key === current ? s.data : LOADING;
        return { key: current, data: { ...data, ...change(data) } };
      });
    };
    /** Sections given their own fetch (or value); the rest are still waiting on the scenes. */
    const started = new Set<keyof WordData>();
    const set = <K extends keyof WordData>(section: K, value: WordData[K]) => {
      started.add(section);
      update(() => ({ [section]: value }));
    };
    const settle = <K extends keyof WordData>(section: K, promise: Promise<DataOf<WordData[K]>>) => {
      started.add(section);
      void sectionOf(promise).then((value) => update(() => ({ [section]: value })));
    };

    // Not waiting for the scenes: these don't depend on them.
    const always = planSources(t, false);
    settle("dictionary", always.dictionary ? fetchDictionary(word, lang) : Promise.resolve(null));
    settle("partners", always.partners ? fetchPartners(word, lang, words) : Promise.resolve([]));
    const none: { article: Article | null; pictures: Picture[] } = { article: null, pictures: [] };
    const article = always.article ? fetchArticle(word, lang, to) : Promise.resolve(none);
    settle("article", article.then((a) => a.article));

    const ready = pack
      ? Promise.all([
          loadPackScenes(pack),
          // Without the places the scenes still show, each titled "Scene 1 of 4".
          loadPlaces().catch(() => ({})),
        ])
          .then(([file, places]) => {
            const entry = file ? wordScenes(file, word) : undefined;
            return entry?.scenes.length ? { ...entry, places } : null;
          })
          // A list file that can't be read is the same as one without this word.
          .catch(() => null)
      : Promise.resolve(null);
    ready
      .then((found) => {
        const plan = planSources(t, found !== null);
        set("scenes", { status: "ready", data: found ? { scenes: found.scenes, places: found.places } : { scenes: [], places: {} } });
        settle("sentences", plan.sentences ? fetchSentences(word, lang, to) : Promise.resolve([]));
        settle("pictures", plan.pictures === "pack" && found ? Promise.resolve(found.pictures) : article.then((a) => a.pictures));
      })
      // Never leave a section loading forever: a section this step didn't get to start couldn't load.
      // Ones it did start fill in from their own fetch.
      .catch(() => update((data) => failLoading(data, (["scenes", "sentences", "pictures"] as const).filter((k) => !started.has(k)))));

    return () => {
      live = false;
    };
    // `words` is loaded once and never changes.
  }, [word, lang, to, pack, words]);

  return state.key === key ? state.data : LOADING;
}
