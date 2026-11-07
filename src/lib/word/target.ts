import type { Flashcard } from "../store";
import { cleanEntry, englishWord } from "../story";
import { LANGUAGES } from "../languages";
import { packWords, STARTER_PACKS, type StarterWords } from "../../data/starter-packs";

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
 * The ready-made list that has this English word, if any (`words`: the lists' loaded words). A few
 * words are in two lists with different meanings ("right": correct / on the right), so `preferred`
 * wins when it has the word.
 */
export function packOf(englishWord: string, words: StarterWords, preferred?: string): string | undefined {
  const w = cleanWord(englishWord).toLowerCase();
  if (!w) return undefined;
  const has = (id: string) => !!packWords(words, id)?.some((row) => cleanWord(row[0]).toLowerCase() === w);
  if (preferred && has(preferred)) return preferred;
  return STARTER_PACKS.find((p) => has(p.id))?.id;
}

/** A language code from the app's list; anything else (a host, "constructor", "") is not one. */
function isLang(v: string | null): v is string {
  return !!v && Object.hasOwn(LANGUAGES, v);
}

/** The word a saved card teaches, its list left out: see targetFromCard and cardHref. */
function cardWord(card: Flashcard): Pick<WordTarget, "word" | "lang" | "to" | "cardId"> {
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
  return { word, lang, to, cardId: card.id };
}

/** The word a saved card teaches: its English side, or else the back (the word being learned). */
export function targetFromCard(card: Flashcard, words: StarterWords): WordTarget {
  const target: WordTarget = cardWord(card);
  const pack = target.lang === "en" ? packOf(target.word, words, card.pack) : undefined;
  if (pack) target.pack = pack;
  return target;
}

/**
 * The link to a saved card's word page, without the lists' words: the card's own list goes in as
 * the hint, and the word page works out the list from it as targetFromCard does (see packOf).
 */
export function cardHref(card: Flashcard): string {
  const target = cardWord(card);
  return wordHref(target.lang === "en" && card.pack ? { ...target, pack: card.pack } : target);
}

/** Reads the page's address. Null when there is no word. */
export function targetFromParams(p: URLSearchParams, fallbackTo: string, words: StarterWords): WordTarget | null {
  const word = cleanWord(p.get("w") ?? "");
  if (!word) return null;
  // Only known codes: `lang` and `to` go into source hostnames ("<lang>.wikipedia.org").
  const rawLang = p.get("lang");
  const rawTo = p.get("to");
  const lang = isLang(rawLang) ? rawLang : "en";
  const target: WordTarget = { word, lang, to: isLang(rawTo) ? rawTo : fallbackTo };
  const cardId = p.get("card");
  if (cardId) target.cardId = cardId;
  const pack = lang === "en" ? packOf(word, words, p.get("pack") ?? undefined) : undefined;
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
