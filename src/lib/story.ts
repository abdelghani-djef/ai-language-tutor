import type { Flashcard, Review } from "./store";
import { State } from "./srs";

// Helpers for reading stories built around the words you are learning
// (principle 3: lots of understandable input, paired with the words you review).

/** Straight and curly apostrophes count as the same letter. */
const apostrophes = (s: string) => s.replace(/[‘’]/g, "'");

/**
 * A word as it would appear in running text: notes in brackets ("loin (de)")
 * and end punctuation ("how are you?") aren't part of the words, and curly
 * apostrophes become straight ones.
 */
export function cleanEntry(text: string): string {
  return apostrophes(text.replace(/\s*\([^)]*\)/g, ""))
    .replace(/[?!.]+$/, "")
    .trim();
}

/** The English side of a card as it would appear in running text, or null when neither side is English. */
export function englishWord(card: Flashcard): string | null {
  const text = card.src === "en" ? card.front : card.tgt === "en" ? card.back : null;
  if (!text) return null;
  return cleanEntry(text) || null;
}

// Common irregular forms of words in the starter packs.
const IRREGULAR: Record<string, string[]> = {
  be: ["am", "is", "are", "was", "were", "been"],
  have: ["has", "had"],
  do: ["does", "did", "done"],
  go: ["goes", "went", "gone"],
  come: ["came"],
  see: ["saw", "seen"],
  make: ["made"],
  get: ["got"],
  give: ["gave", "given"],
  take: ["took", "taken"],
  eat: ["ate", "eaten"],
  drink: ["drank"],
  run: ["ran"],
  sit: ["sat"],
  say: ["said"],
  tell: ["told"],
  think: ["thought"],
  know: ["knew", "known"],
  buy: ["bought"],
  bring: ["brought"],
  find: ["found"],
  feel: ["felt"],
  sleep: ["slept"],
  read: ["read"],
  write: ["wrote", "written"],
  speak: ["spoke"],
  swim: ["swam"],
  sing: ["sang"],
  stand: ["stood"],
  put: ["put"],
  leave: ["left"],
  meet: ["met"],
  wear: ["wore"],
  fly: ["flew"],
  wake: ["woke", "woken"],
  leaf: ["leaves"],
  wife: ["wives"],
  knife: ["knives"],
  child: ["children"],
  man: ["men"],
  woman: ["women"],
  person: ["people"],
  foot: ["feet"],
  tooth: ["teeth"],
  mouse: ["mice"],
  fish: ["fish"],
  sheep: ["sheep"],
  good: ["better", "best"],
  bad: ["worse", "worst"],
};

/**
 * The forms of a word to look for in a story: the word, its irregular forms,
 * and regular -s/-es, -ed and -ing endings. Endings are only added to words of
 * three letters or more, so "hi" doesn't match "his" nor "be" match "bed".
 */
export function wordForms(word: string): string[] {
  const w = apostrophes(word).toLowerCase();
  // Two-word verbs change their first word ("wake up" → "woke up") and can
  // take a pronoun in between ("put on" → "puts it on").
  const space = w.indexOf(" ");
  if (space > 0 && /^(up|down|on|off|in|out|away|back|over)$/.test(w.slice(space + 1))) {
    const particle = w.slice(space + 1);
    return wordForms(w.slice(0, space)).flatMap((f) => [
      `${f} ${particle}`,
      ...["it", "them", "him", "her", "me", "you", "us"].map((p) => `${f} ${p} ${particle}`),
    ]);
  }
  const forms = new Set([w, ...(IRREGULAR[w] ?? [])]);
  if (/\s/.test(w) || w.length < 3) return [...forms];
  const consonantY = /[^aeiou]y$/.test(w);
  const stem = w.endsWith("e") ? w.slice(0, -1) : w;
  // Doubled final consonant for short words like stop → stopped, run → running.
  const doubled = /^[^aeiou]*[aeiou][bdgklmnprt]$/.test(w) ? w + w.at(-1) : w;
  forms.add(consonantY ? `${w.slice(0, -1)}ies` : /(s|x|z|ch|sh|[^aeiou]o)$/.test(w) ? `${w}es` : `${w}s`);
  forms.add(consonantY ? `${w.slice(0, -1)}ied` : w.endsWith("e") ? `${w}d` : `${doubled}ed`);
  forms.add(w.endsWith("ie") ? `${w.slice(0, -2)}ying` : w.endsWith("e") && !w.endsWith("ee") ? `${stem}ing` : `${doubled}ing`);
  if (/(er|est)$/.test(w) === false && w.length <= 6 && !/\s/.test(w)) {
    // Comparatives of short describing words: big → bigger, nice → nicer.
    forms.add(w.endsWith("e") ? `${w}r` : `${doubled}er`);
  }
  return [...forms];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type StoryPart = { text: string; cardId?: string };

/**
 * Splits story text so each learned word, in any of its forms, is its own
 * part linked to its card. Longer phrases win, so "thank you" is one part
 * rather than "thank" alone. Apostrophes match either way.
 */
export function highlightWords(text: string, cards: { id: string; word: string }[]): StoryPart[] {
  const entries = cards
    .filter((c) => c.word)
    .flatMap((c) => wordForms(c.word).map((form) => ({ id: c.id, form })))
    .sort((a, b) => b.form.length - a.form.length);
  if (!entries.length) return [{ text }];
  const byForm = new Map<string, string>();
  for (const e of entries) if (!byForm.has(e.form)) byForm.set(e.form, e.id);
  const pattern = [...byForm.keys()].map((f) => escape(f).replace(/'/g, "['’]")).join("|");
  const re = new RegExp(`(?<![\\p{L}\\p{N}'’])(${pattern})(?![\\p{L}\\p{N}])`, "giu");
  const parts: StoryPart[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const id = byForm.get(apostrophes(m[0]).toLowerCase());
    if (!id) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], cardId: id });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Cards you have met: studied at least once, or shown for the first time. */
export function metCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter((c) => englishWord(c) && (c.srs.state !== State.New || c.introducedAt));
}

/** Cards studied or first seen today, most recent first, one per English word. */
export function todaysCards(cards: Flashcard[], reviews: Review[], today: string): Flashcard[] {
  const byId = new Map(cards.filter((c) => englishWord(c)).map((c) => [c.id, c]));
  const out: Flashcard[] = [];
  const seen = new Set<string>();
  for (const r of [...reviews].reverse()) {
    const c = r.day === today ? byId.get(r.cardId) : undefined;
    const w = c && englishWord(c)!.toLowerCase();
    if (c && w && !seen.has(w)) {
      seen.add(w);
      out.push(c);
    }
  }
  return out;
}

/** A story and how many of the given cards it uses. */
export interface StoryMatch<S> {
  story: S;
  used: number;
}

/**
 * The stories you can read (those of packs you've added), best first: the
 * one using the most of `cards` (e.g. today's words), then in pack order.
 */
export function rankStories<S extends { pack: string; title: { en: string }; text: { en: string } }>(
  stories: S[],
  packs: Set<string>,
  cards: Flashcard[],
): StoryMatch<S>[] {
  const linked = cards.map((c) => ({ id: c.id, word: englishWord(c) ?? "" }));
  return stories
    .map((story, index) => ({ story, index }))
    .filter(({ story }) => packs.has(story.pack))
    .map(({ story, index }) => {
      const parts = highlightWords(`${story.title.en}\n${story.text.en}`, linked);
      return { story, index, used: new Set(parts.map((p) => p.cardId).filter(Boolean)).size };
    })
    .sort((a, b) => b.used - a.used || a.index - b.index)
    .map(({ story, used }) => ({ story, used }));
}
