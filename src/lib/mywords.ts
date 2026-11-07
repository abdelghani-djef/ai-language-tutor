// My words: which words are the learner's (English with their language), which
// can be studied, which ready-made words are already sorted, and the level.
// Pure functions of the saved data. Only types come from the store, so the
// store can import these at runtime without an import cycle. Those about
// ready-made words take the lists' words (`words`, see useStarterWords /
// loadStarterWords in starter-words.ts) once they are loaded.

import { isAdvanced, packWords, rowOf, STARTER_PACKS, type StarterRow, type StarterWords } from "../data/starter-packs";
import type { Data, Flashcard, LearnerLang, WordStatus } from "./store";

/** The list filter value for words typed by the learner (no ready-made list). */
export const OWN = "own";

type Mine = Pick<Data, "cards" | "profile">;
type Sortable = Pick<Data, "cards" | "known" | "profile">;

/** The learner's words: English with a translation in their current language. None before setup. */
export function myCards(d: Mine): Flashcard[] {
  const lang = d.profile?.lang;
  if (!lang) return [];
  return d.cards.filter((c) => c.src === "en" && c.tgt === lang);
}

/** No list means every word; `OWN` means the learner's own words; anything else is a ready-made list id. */
export function inList(c: Flashcard, list: string | null | undefined): boolean {
  if (!list) return true;
  if (list === OWN) return !c.pack;
  return c.pack === list;
}

/**
 * A `?list=` value that names something: `OWN` or a ready-made list id. Anything
 * else (missing, unknown, an old id) means all of My words.
 */
export function validList(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw === OWN || STARTER_PACKS.some((p) => p.id === raw) ? raw : null;
}

/** Words that can be studied: the learner's Should learn words, in `list` if given. */
export function studyCards(d: Mine, list?: string | null): Flashcard[] {
  return myCards(d).filter((c) => c.status === "learn" && inList(c, list));
}

/**
 * A word typed on the Add page, stored English first whichever field the
 * learner typed in (`from` is the language of `typed`), both sides trimmed.
 */
export function toStored(from: string, typed: string, translation: string): { front: string; back: string } {
  const a = typed.trim();
  const b = translation.trim();
  return from === "en" ? { front: a, back: b } : { front: b, back: a };
}

/** The learner's card with this English word and translation, ignoring case and spaces at the ends. */
export function sameWordIn(d: Mine, front: string, back: string): Flashcard | undefined {
  return myCards(d).find((c) => norm(c.front) === norm(front) && norm(c.back) === norm(back));
}

/** The `known` key for a ready-made word sorted as Already know and never studied. */
export function knownKey(lang: LearnerLang, pack: string, word: string): string {
  return `${lang}:${pack}:${word}`;
}

const norm = (s: string) => s.trim().toLowerCase();
const packWordKey = (pack: string, word: string) => `${pack}\u0000${norm(word)}`;
/** A word typed by the learner is its English word plus its translation, both lowercased. */
const pairKey = (en: string, translation: string) => `${norm(en)}\u0000${norm(translation)}`;
const translationOf = (row: StarterRow, lang: LearnerLang) => (lang === "fr" ? row[1] : row[2]);

/** The learner's `known` keys in their language, split into list and English word. */
function knownIn(known: Record<string, number>, lang: LearnerLang): { pack: string; word: string; at: number }[] {
  const prefix = `${lang}:`;
  const out: { pack: string; word: string; at: number }[] = [];
  for (const [key, at] of Object.entries(known)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const i = rest.indexOf(":");
    if (i <= 0 || i === rest.length - 1) continue;
    out.push({ pack: rest.slice(0, i), word: rest.slice(i + 1), at });
  }
  return out;
}

interface SortIndex {
  lang: LearnerLang;
  known: Record<string, number>;
  /** The learner's cards from a ready-made list, by list and English word. */
  packCards: Map<string, Flashcard>;
  /** The learner's own cards, by English word and translation. */
  ownCards: Map<string, Flashcard>;
}

function sortIndex(d: Sortable): SortIndex | null {
  const lang = d.profile?.lang;
  if (!lang) return null;
  const packCards = new Map<string, Flashcard>();
  const ownCards = new Map<string, Flashcard>();
  for (const c of myCards(d)) {
    const key = c.pack ? packWordKey(c.pack, c.front) : pairKey(c.front, c.back);
    const into = c.pack ? packCards : ownCards;
    if (!into.has(key)) into.set(key, c);
  }
  return { lang, known: d.known, packCards, ownCards };
}

/**
 * The card that stands for a ready-made word: one from the list, or an own card
 * with the same English word and translation.
 */
function cardFor(ix: SortIndex, pack: string, word: string, row: StarterRow | undefined): Flashcard | undefined {
  return (
    ix.packCards.get(packWordKey(pack, word)) ??
    (row ? ix.ownCards.get(pairKey(row[0], translationOf(row, ix.lang))) : undefined)
  );
}

/**
 * The part a ready-made word is in, or undefined while it isn't sorted. A card
 * for the word (see cardFor) wins over a `known` key, so the word is in one part only.
 */
function partOf(ix: SortIndex, pack: string, word: string, row: StarterRow | undefined): WordStatus | undefined {
  const c = cardFor(ix, pack, word, row);
  if (c) return c.status;
  if (typeof ix.known[knownKey(ix.lang, pack, word)] === "number") return "known";
  return undefined;
}

/** Whether a ready-made word (its list plus its English word) is sorted in the learner's language. */
export function isSorted(d: Sortable, pack: string, word: string, words: StarterWords): boolean {
  const ix = sortIndex(d);
  if (!ix) return false;
  const row = rowOf(words, pack, word);
  return partOf(ix, pack, word, row) !== undefined;
}

/** The words still to sort in these lists, list by list in the given order, each list in its own order. */
export function sortQueue(d: Sortable, packIds: string[], words: StarterWords): { pack: string; word: string }[] {
  const ix = sortIndex(d);
  if (!ix) return [];
  const out: { pack: string; word: string }[] = [];
  for (const id of new Set(packIds)) {
    for (const row of packWords(words, id) ?? []) {
      if (partOf(ix, id, row[0], row) === undefined) out.push({ pack: id, word: row[0] });
    }
  }
  return out;
}

/** How a ready-made list is sorted: words in Already know, in Should learn, and left to sort. */
export function packProgress(
  d: Sortable,
  packId: string,
  words: StarterWords,
): { total: number; known: number; learn: number; left: number } {
  const rows = packWords(words, packId) ?? [];
  const ix = sortIndex(d);
  let known = 0;
  let learn = 0;
  if (ix) {
    for (const row of rows) {
      const part = partOf(ix, packId, row[0], row);
      if (part === "known") known += 1;
      else if (part === "learn") learn += 1;
    }
  }
  return { total: rows.length, known, learn, left: rows.length - known - learn };
}

/** The ready-made lists with at least one word sorted in the learner's language. */
export function sortedPacks(d: Sortable, words: StarterWords): Set<string> {
  const ix = sortIndex(d);
  const out = new Set<string>();
  if (!ix) return out;
  for (const p of STARTER_PACKS) {
    if (packWords(words, p.id)?.some((row) => partOf(ix, p.id, row[0], row) !== undefined)) out.add(p.id);
  }
  return out;
}

/** A word in Already know: a card, or a ready-made word sorted as known and never studied. */
export interface KnownEntry {
  pack?: string;
  word: string;
  translation: string;
  emoji?: string;
  card?: Flashcard;
  at: number;
}

/**
 * Everything in Already know in the learner's language, newest first. A `known`
 * key whose word also has a card (see cardFor) is left to the card; one whose
 * list or word no longer exists is left out (there is no translation to show).
 */
export function knownWords(d: Sortable, words: StarterWords): KnownEntry[] {
  const ix = sortIndex(d);
  if (!ix) return [];
  const out: KnownEntry[] = [];
  for (const { pack, word, at } of knownIn(d.known, ix.lang)) {
    const row = rowOf(words, pack, word);
    if (!row || cardFor(ix, pack, word, row)) continue;
    out.push({ pack, word, translation: translationOf(row, ix.lang), emoji: row[3] || undefined, at });
  }
  for (const c of myCards(d)) {
    if (c.status !== "known") continue;
    out.push({ pack: c.pack, word: c.front, translation: c.back, emoji: c.emoji, card: c, at: c.knownAt ?? c.createdAt });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** The tags of `cards` in `list` (see inList), each once ignoring case (first spelling kept), most used first. */
export function tagsOf(cards: Flashcard[], list: string | null): { tag: string; n: number }[] {
  const counts = new Map<string, { tag: string; n: number }>();
  for (const c of cards) {
    if (!inList(c, list)) continue;
    for (const tag of c.tags ?? []) {
      const key = tag.toLocaleLowerCase();
      counts.set(key, { tag: counts.get(key)?.tag ?? tag, n: (counts.get(key)?.n ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
}

/** What My words is filtered by: a list (see inList), a tag and a search, each optional. */
export interface WordFilter {
  list: string | null;
  tag: string | null;
  query: string;
}

/**
 * The words of each part that pass the filter. The search matches either side,
 * the example, notes and tags, ignoring case. A ready-made word sorted as known
 * without a card has no tags, and is never one of the learner's own words.
 */
export function filterMyWords(
  learn: Flashcard[],
  known: KnownEntry[],
  { list, tag, query }: WordFilter,
): { learn: Flashcard[]; known: KnownEntry[] } {
  const q = query.trim().toLocaleLowerCase();
  const tagKey = tag?.toLocaleLowerCase();
  const matches = (...fields: (string | undefined)[]) => !q || fields.some((f) => f?.toLocaleLowerCase().includes(q));
  const cardShown = (c: Flashcard) =>
    inList(c, list) &&
    (!tagKey || !!c.tags?.some((t) => t.toLocaleLowerCase() === tagKey)) &&
    matches(c.front, c.back, c.example, c.notes, ...(c.tags ?? []));
  return {
    learn: learn.filter(cardShown),
    known: known.filter((e) =>
      e.card ? cardShown(e.card) : !tag && (!list || e.pack === list) && matches(e.word, e.translation),
    ),
  };
}

export type LevelId = "starter" | "a1" | "a2" | "b1" | "b2";

/** The levels and the points each one starts at. */
export const LEVELS: readonly { id: LevelId; min: number }[] = [
  { id: "starter", min: 0 },
  { id: "a1", min: 100 },
  { id: "a2", min: 400 },
  { id: "b1", min: 1000 },
  { id: "b2", min: 2000 },
];

const pointsFor = (pack: string | undefined) => (isAdvanced(pack) ? 2 : 1);

/**
 * The learner's level in their current language. Each Already know word is a
 * point, two from an advanced list. A word with both a card (see cardFor) and a
 * `known` key counts once, by its card.
 */
export function levelOf(d: Sortable, words: StarterWords): { id: LevelId; points: number; next?: { id: LevelId; min: number } } {
  const ix = sortIndex(d);
  let points = 0;
  if (ix) {
    for (const { pack, word } of knownIn(d.known, ix.lang)) {
      const row = rowOf(words, pack, word);
      if (!cardFor(ix, pack, word, row)) points += pointsFor(pack);
    }
    for (const c of myCards(d)) if (c.status === "known") points += pointsFor(c.pack);
  }
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i += 1;
  const next = LEVELS[i + 1];
  return next ? { id: LEVELS[i].id, points, next } : { id: LEVELS[i].id, points };
}
