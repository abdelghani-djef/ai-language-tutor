// Moving around a word page: between its scenes, and between the words opened in the overlay.

/**
 * How many scenes an arrow key moves: the right arrow goes to the next scene and the left arrow to
 * the previous one, swapped in right to left where the next scene sits on the left. Other keys: 0.
 */
export function stepFor(key: string, rtl: boolean): -1 | 0 | 1 {
  if (key === "ArrowRight") return rtl ? -1 : 1;
  if (key === "ArrowLeft") return rtl ? 1 : -1;
  return 0;
}

/** A scene index kept between the first and the last of `count` scenes (0 when there are none). */
export function clampScene(i: number, count: number): number {
  return Math.max(0, Math.min(i, count - 1));
}

/** Word types the interface names in every language; other dictionary values are English only. */
export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "numeral",
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

/** The dictionary's word type as one the interface names, or null. */
export function partOfSpeech(value: string): PartOfSpeech | null {
  const v = value.trim().toLowerCase();
  return (PARTS_OF_SPEECH as readonly string[]).includes(v) ? (v as PartOfSpeech) : null;
}

/** The header font's widest letters, as a share of its size. */
const EM_PER_CHAR = 0.62;

/**
 * The header word's font size, in cqi of its column, that keeps its longest word on one line: a
 * break inside "grandmother" is hard to read for a child. The page caps it at the usual size.
 */
export function headlineSize(word: string): number {
  const longest = Math.max(1, ...word.split(/\s+/).map((w) => Array.from(w).length));
  return 100 / (longest * EM_PER_CHAR);
}

// ---- the overlay's history entries

/** Where an overlay entry's history.state says how many word pages are open at it. */
export const OVERLAY_KEY = "linguacardsWordPages";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** How many word pages the overlay has open at a history entry with this state (0: none). */
export function overlayDepth(state: unknown): number {
  const d = isObj(state) ? state[OVERLAY_KEY] : undefined;
  return typeof d === "number" && Number.isInteger(d) && d > 0 ? d : 0;
}

/** The state for an entry with `depth` word pages open: the current one (Next.js keeps its own there) plus the depth. */
export function overlayState(state: unknown, depth: number): Record<string, unknown> {
  return { ...(isObj(state) ? state : {}), [OVERLAY_KEY]: depth };
}

/** The state without the overlay's depth. */
export function withoutOverlay(state: unknown): Record<string, unknown> {
  const rest = { ...(isObj(state) ? state : {}) };
  delete rest[OVERLAY_KEY];
  return rest;
}

/** The words opened in the overlay, in order, and how many of them are open (the last open one is on screen). */
export interface Trail<W> {
  words: W[];
  depth: number;
}

export function openTrail<W>(word: W): Trail<W> {
  return { words: [word], depth: 1 };
}

/** A word opened from the one on screen; words gone back from are dropped, as a browser does. */
export function pushTrail<W>(trail: Trail<W>, word: W): Trail<W> {
  return { words: [...trail.words.slice(0, trail.depth), word], depth: trail.depth + 1 };
}

/** After Back or Forward lands on an entry with `depth` word pages open (kept within the words known). */
export function trailAt<W>(trail: Trail<W>, depth: number): Trail<W> {
  return { words: trail.words, depth: Math.max(0, Math.min(depth, trail.words.length)) };
}

/** The word on screen, none when the overlay is closed. */
export function trailWord<W>(trail: Trail<W>): W | undefined {
  return trail.depth > 0 ? trail.words[trail.depth - 1] : undefined;
}
