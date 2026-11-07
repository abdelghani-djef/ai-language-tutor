/**
 * Ready-made scenes: short conversations that use a word, written ahead of time for every word of
 * the ready-made lists. They are not in the app bundle: one file per list, `public/scenes/<list>.json`,
 * fetched when a word page opens, plus the shared places in `public/scenes/_places.json` (underscore: no list id starts with one).
 */
import { packWords, STARTER_PACKS, type StarterWords } from "../../data/starter-packs";
import { highlightWords } from "../story";
import { fetchJson } from "./fetch";
import type { Picture } from "./sources";
import { cleanWord } from "./target";

type Tri = { en: string; fr: string; ar: string };

/** One line of a conversation. `text.en` uses the word. */
export interface SceneLine { who: Tri; text: Tri }
/** A 2–4 line conversation. `place` is a key of _places.json. */
export interface Scene { place: string; lines: SceneLine[] }
/** Where scenes happen ("🥖 At the bakery"), shared by every scene set there. */
export interface Place { emoji: string; label: Tri; picture?: Picture }
/** One list's file. `words` is keyed by the English word exactly as in the list's rows (starter-words.ts). */
export interface PackScenes {
  pack: string;
  /**
   * True when every word of the list has its scenes; the checks then require all of them. A list
   * that grew after its scenes were written says false: its newer words load sentences and pictures live.
   */
  complete?: boolean;
  words: Record<string, { scenes: Scene[]; pictures: Picture[] }>;
}

const SCENES_PER_WORD = 4;
const MIN_LINES = 2;
const MAX_LINES = 4;
/** Scene files change only with an app release; a day keeps them fresh enough. */
const MAX_AGE_DAYS = 1;
/**
 * Part of every scenes URL, so a release that adds words or lists asks for new files instead of the
 * cached ones (the cache is keyed by URL). The number of ready-made words changes whenever a list grows.
 * Counted from the lists' index, so it is there before (and without) their words.
 */
export const SCENES_VERSION = STARTER_PACKS.reduce((n, p) => n + p.size, 0);

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const filled = (x: unknown) => typeof x === "string" && x.trim() !== "";

/** True when the English text uses the word in one of its forms, as the page will highlight it. */
function usesWord(text: string, word: string): boolean {
  return highlightWords(text, [{ id: "w", word: cleanWord(word) }]).some((part) => part.cardId);
}

function sceneProblems(word: string, n: number, scene: unknown, places: Record<string, Place>): string[] {
  const at = `${word}: scene ${n}`;
  if (!isObj(scene)) return [`${at} is not a scene`];
  const out: string[] = [];
  if (typeof scene.place !== "string" || !Object.hasOwn(places, scene.place)) {
    out.push(`${at} has an unknown place ${JSON.stringify(scene.place)}`);
  }
  const lines = Array.isArray(scene.lines) ? scene.lines : [];
  if (lines.length < MIN_LINES || lines.length > MAX_LINES) {
    out.push(`${at} has ${lines.length} line${lines.length === 1 ? "" : "s"}, needs ${MIN_LINES} to ${MAX_LINES}`);
  }
  lines.forEach((line, i) => {
    for (const field of ["who", "text"] as const) {
      const value = isObj(line) ? line[field] : undefined;
      for (const lang of ["en", "fr", "ar"] as const) {
        if (!isObj(value) || !filled(value[lang])) out.push(`${at} line ${i + 1} has no ${field}.${lang}`);
      }
    }
  });
  const usesIt = lines.some((line) => isObj(line) && isObj(line.text) && filled(line.text.en) && usesWord(String(line.text.en), word));
  if (!usesIt) out.push(`${at} does not use the word`);
  return out;
}

/**
 * The content checks for a list's scenes file: problems as "word: what is wrong", [] when valid.
 * Every word belongs to the list, has 4 scenes in 4 different known places, each with 2–4 lines,
 * every en/fr/ar text filled and at least one English line using the word. Every word of the list
 * must be there only once the file says `complete: true`. `words`: the lists' words (starter-words.ts).
 */
export function validatePackScenes(json: unknown, places: Record<string, Place>, words: StarterWords): string[] {
  if (!isObj(json) || typeof json.pack !== "string" || !isObj(json.words)) return ["not a scenes file"];
  const list = STARTER_PACKS.find((p) => p.id === json.pack);
  const rows = list && packWords(words, list.id);
  if (!list || !rows) return [`${JSON.stringify(json.pack)} is not a ready-made list`];
  const listWords = rows.map((row) => row[0]);
  const out: string[] = [];

  for (const [word, entry] of Object.entries(json.words)) {
    if (!listWords.includes(word)) {
      out.push(`${word}: not a word of the ${list.id} list`);
      continue;
    }
    if (!isObj(entry) || !Array.isArray(entry.scenes)) {
      out.push(`${word}: has no scenes`);
      continue;
    }
    if (entry.scenes.length !== SCENES_PER_WORD) out.push(`${word}: has ${entry.scenes.length} scenes, needs ${SCENES_PER_WORD}`);
    entry.scenes.forEach((scene, i) => out.push(...sceneProblems(word, i + 1, scene, places)));
    const used = entry.scenes.map((s) => (isObj(s) ? s.place : undefined)).filter((p) => typeof p === "string");
    for (const place of new Set(used.filter((p, i) => used.indexOf(p) !== i))) out.push(`${word}: place ${JSON.stringify(place)} is used twice`);
    if (!Array.isArray(entry.pictures)) {
      out.push(`${word}: pictures must be a list`);
    } else {
      entry.pictures.forEach((p, i) => {
        if (!isObj(p) || !filled(p.thumb) || !filled(p.page)) out.push(`${word}: picture ${i + 1} needs thumb and page`);
      });
    }
  }

  if (json.complete === true) {
    for (const word of listWords) if (!Object.hasOwn(json.words, word)) out.push(`${word}: missing`);
  }
  return out;
}

/** A list file's entry for the page's (cleaned) word: "how are you" finds "how are you?". */
export function wordScenes(pack: PackScenes, word: string): PackScenes["words"][string] | undefined {
  const w = word.toLowerCase();
  const key = Object.keys(pack.words).find((k) => cleanWord(k).toLowerCase() === w);
  return key === undefined ? undefined : pack.words[key];
}

/**
 * A ready-made list's scenes, from the site itself. Null when the list has no scenes file yet (404)
 * or the file is not one; rejects when it couldn't be loaded.
 */
export async function loadPackScenes(pack: string): Promise<PackScenes | null> {
  const json = await fetchJson<unknown>(`/scenes/${encodeURIComponent(pack)}.json?v=${SCENES_VERSION}`, MAX_AGE_DAYS);
  return isObj(json) && typeof json.pack === "string" && isObj(json.words) ? (json as unknown as PackScenes) : null;
}

/** Every place scenes happen in, keyed by id. None when there is no places file (404); rejects when it couldn't be loaded. */
export async function loadPlaces(): Promise<Record<string, Place>> {
  const json = await fetchJson<unknown>(`/scenes/_places.json?v=${SCENES_VERSION}`, MAX_AGE_DAYS);
  return isObj(json) ? (json as Record<string, Place>) : {};
}
