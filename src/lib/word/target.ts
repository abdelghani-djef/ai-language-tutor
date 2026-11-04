import type { Flashcard } from "../store";
import { cleanEntry, englishWord } from "../story";
import { LANGUAGES } from "../languages";
import { STARTER_PACKS } from "../../data/starter-packs";

/** What a word page is about. */
export interface WordTarget {
  /** Cleaned, e.g. "how are you". */
  word: string;
  /** Language of `word`, e.g. "en". */
  lang: string;
  /** The learner's language for translations, e.g. "fr". */
  to: string;
  /** The saved word, if any. */
  cardId?: string;
  /** The ready-made list the English word is in, if any. */
  pack?: string;
}

/** The word as it would appear in running text (no brackets, end punctuation or curly apostrophes). */
export function cleanWord(text: string): string {
  return cleanEntry(text);
}

/**
 * The ready-made list that has this English word, if any. A few words are in two lists with
 * different meanings ("right": correct / on the right), so `preferred` wins when it has the word.
 */
export function packOf(englishWord: string, preferred?: string): string | undefined {
  const w = cleanWord(englishWord).toLowerCase();
  if (!w) return undefined;
  const has = (p: (typeof STARTER_PACKS)[number]) => p.words.some((row) => cleanWord(row[0]).toLowerCase() === w);
  const own = preferred ? STARTER_PACKS.find((p) => p.id === preferred) : undefined;
  if (own && has(own)) return own.id;
  return STARTER_PACKS.find(has)?.id;
}

/** A language code from the app's list; anything else (a host, "constructor", "") is not one. */
function isLang(v: string | null): v is string {
  return !!v && Object.hasOwn(LANGUAGES, v);
}

/** The word a saved card teaches: its English side, or else the back (the word being learned). */
export function targetFromCard(card: Flashcard): WordTarget {
  const english = englishWord(card);
  let word: string;
  let lang: string;
  let to: string;
  if (english) {
    word = english;
    lang = "en";
    to = card.src === "en" ? card.tgt : card.src;
  } else {
    word = cleanWord(card.back);
    lang = card.tgt;
    to = card.src;
  }
  const target: WordTarget = { word, lang, to, cardId: card.id };
  const pack = lang === "en" ? packOf(word, card.pack) : undefined;
  if (pack) target.pack = pack;
  return target;
}

/** Reads the page's address. Null when there is no word. */
export function targetFromParams(p: URLSearchParams, fallbackTo: string): WordTarget | null {
  const word = cleanWord(p.get("w") ?? "");
  if (!word) return null;
  // Only known codes: `lang` and `to` go into source hostnames ("<lang>.wikipedia.org").
  const rawLang = p.get("lang");
  const rawTo = p.get("to");
  const lang = isLang(rawLang) ? rawLang : "en";
  const target: WordTarget = { word, lang, to: isLang(rawTo) ? rawTo : fallbackTo };
  const cardId = p.get("card");
  if (cardId) target.cardId = cardId;
  const pack = lang === "en" ? packOf(word, p.get("pack") ?? undefined) : undefined;
  if (pack) target.pack = pack;
  return target;
}

/** The link to a word's page: "/word/?w=…&lang=…&to=…[&card=…][&pack=…]". */
export function wordHref(t: Pick<WordTarget, "word" | "lang" | "to" | "cardId" | "pack">): string {
  const enc = encodeURIComponent;
  const card = t.cardId ? `&card=${enc(t.cardId)}` : "";
  const pack = t.pack ? `&pack=${enc(t.pack)}` : "";
  return `/word/?w=${enc(t.word)}&lang=${enc(t.lang)}&to=${enc(t.to)}${card}${pack}`;
}
