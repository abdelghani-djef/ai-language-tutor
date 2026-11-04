/**
 * The free online word sources, called straight from the browser: Free Dictionary, Wiktionary,
 * Datamuse, Tatoeba and Wikipedia. Each `parseX` turns a raw answer into app data and never throws;
 * each `fetchX` builds the URL, goes through `fetchJson` and parses. A `fetchX` resolves with null / []
 * when the source has nothing for the word (a 404 or an empty answer), and rejects when the source
 * couldn't be reached, so the page shows "couldn't load" instead of hiding the section.
 */
import { STARTER_PACKS } from "../../data/starter-packs";
import { cleanEntry } from "../story";
import { isCleanSentence, stripHtml } from "./clean";
import { fetchJson } from "./fetch";

const FAILED = Symbol("failed");
/** For optional extras: the answer (null for a 404), or `FAILED` when the source couldn't be reached. */
const attempt = (url: string, maxAgeDays?: number): Promise<unknown> => fetchJson<unknown>(url, maxAgeDays).catch(() => FAILED);

/** Wikipedia answers are kept a day only, so a briefly vandalised summary or picture doesn't stay for a month. */
const WIKIPEDIA_DAYS = 1;
/** A language code fit for a hostname ("en", "zh-yue"). `lang` and `to` come from the URL, so anything else is refused. */
const LANG_CODE = /^[a-z]{2,3}(-[a-z]+)?$/;
const isLangCode = (lang: string) => LANG_CODE.test(lang);

export interface Recording { url: string; accent: "uk" | "us" | "other"; licence?: string; source?: string }
export interface Sense { partOfSpeech: string; definition: string; example?: string }
export interface DictionaryEntry {
  phonetic?: string;
  recordings: Recording[];
  senses: Sense[];
  synonyms: string[];
  source: "free-dictionary" | "wiktionary";
}
export interface Sentence { text: string; translation?: string; author?: string; licence: string; source: "tatoeba" | "dictionary" }
export interface Picture { thumb: string; page: string; author?: string; licence?: string; caption?: string }
export interface Article { title: string; extract: string; url: string; lang: string; image?: Picture }

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown): string | undefined => (typeof x === "string" && x.trim() ? x.trim() : undefined);
const enc = encodeURIComponent;

/** Tatoeba's three-letter codes for the app's languages. */
const ISO3: Record<string, string> = {
  en: "eng", fr: "fra", ar: "ara", es: "spa", de: "deu", it: "ita", pt: "por",
  nl: "nld", ru: "rus", tr: "tur", hi: "hin", zh: "cmn", ja: "jpn", ko: "kor",
};
/** The Tatoeba code, own keys only ("constructor" has none). */
const iso3 = (lang: string): string | undefined => (Object.hasOwn(ISO3, lang) ? ISO3[lang] : undefined);

const TATOEBA_LICENCE = "CC BY 2.0 FR";
const MAX_SENTENCES = 6;

// ---------------------------------------------------------------- dictionary

function accentOf(url: string): Recording["accent"] {
  const m = /-([a-z]{2})\.[a-z0-9]+$/i.exec(url);
  const suffix = m?.[1].toLowerCase();
  return suffix === "uk" ? "uk" : suffix === "us" ? "us" : "other";
}

/** api.dictionaryapi.dev answer (an array of entries) → one entry. Null when it has no senses. */
export function parseFreeDictionary(json: unknown): DictionaryEntry | null {
  const recordings: Recording[] = [];
  const senses: Sense[] = [];
  const synonyms = new Set<string>();
  const seenSense = new Set<string>();
  let phonetic: string | undefined;

  for (const entry of arr(json).filter(isObj)) {
    phonetic ??= str(entry.phonetic);
    for (const p of arr(entry.phonetics).filter(isObj)) {
      phonetic ??= str(p.text);
      const url = str(p.audio);
      if (!url || recordings.some((r) => r.url === url)) continue;
      const rec: Recording = { url, accent: accentOf(url) };
      const licence = isObj(p.license) ? str(p.license.name) : undefined;
      const source = str(p.sourceUrl);
      if (licence) rec.licence = licence;
      if (source) rec.source = source;
      recordings.push(rec);
    }
    for (const m of arr(entry.meanings).filter(isObj)) {
      const partOfSpeech = str(m.partOfSpeech) ?? "";
      for (const s of arr(m.synonyms)) if (str(s)) synonyms.add(str(s)!);
      for (const d of arr(m.definitions).filter(isObj)) {
        const definition = str(d.definition);
        for (const s of arr(d.synonyms)) if (str(s)) synonyms.add(str(s)!);
        const key = `${partOfSpeech}|${definition}`;
        if (!definition || seenSense.has(key)) continue;
        seenSense.add(key);
        const sense: Sense = { partOfSpeech, definition };
        const example = str(d.example);
        if (example && isCleanSentence(example)) sense.example = example;
        senses.push(sense);
      }
    }
  }

  if (!senses.length) return null;
  const result: DictionaryEntry = { recordings, senses, synonyms: [...synonyms], source: "free-dictionary" };
  if (phonetic) result.phonetic = phonetic;
  return result;
}

/** en.wiktionary.org definition answer → the entry for `lang` (the answer is keyed by language code). */
export function parseWiktionary(json: unknown, lang: string): DictionaryEntry | null {
  if (!isObj(json) || !Object.hasOwn(json, lang)) return null;
  const senses: Sense[] = [];
  const seen = new Set<string>();
  for (const group of arr(json[lang]).filter(isObj)) {
    const partOfSpeech = (str(group.partOfSpeech) ?? "").toLowerCase();
    for (const d of arr(group.definitions).filter(isObj)) {
      const definition = stripHtml(str(d.definition) ?? "");
      const key = `${partOfSpeech}|${definition}`;
      if (!definition || seen.has(key)) continue;
      seen.add(key);
      const sense: Sense = { partOfSpeech, definition };
      const first = arr(d.parsedExamples).filter(isObj)[0]?.example ?? arr(d.examples)[0];
      const example = stripHtml(str(first) ?? "");
      if (example && isCleanSentence(example)) sense.example = example;
      senses.push(sense);
    }
  }
  return senses.length ? { recordings: [], senses, synonyms: [], source: "wiktionary" } : null;
}

/**
 * English: Free Dictionary, retried once when it fails (it often answers 502; a 404 just means no
 * entry), then Wiktionary when it has nothing. Other languages: Wiktionary. Its definition API only
 * exists on en.wiktionary.org (other editions answer 501) and covers every language, keyed by code.
 * Rejects when Wiktionary is needed and fails. Null, without asking, for a `lang` that is not a language code.
 */
export async function fetchDictionary(word: string, lang: string): Promise<DictionaryEntry | null> {
  if (!isLangCode(lang)) return null;
  if (lang === "en") {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${enc(word)}`;
    const json = await fetchJson<unknown>(url).catch(() => fetchJson<unknown>(url).catch(() => null));
    const entry = parseFreeDictionary(json);
    if (entry) return entry;
  }
  return parseWiktionary(await fetchJson<unknown>(`https://en.wiktionary.org/api/rest_v1/page/definition/${enc(word)}`), lang);
}

// ---------------------------------------------------------------- partners

/** Datamuse answer → its words, in order. */
export function parseDatamuse(json: unknown, max = 8): string[] {
  return arr(json)
    .filter(isObj)
    .map((x) => str(x.word))
    .filter((w): w is string => !!w)
    .slice(0, max);
}

const MAX_PARTNERS = 8;
/** Related words are asked for generously: most of them are dropped (see `fetchPartners`). */
const MAX_RELATED = 30;

/**
 * "&md=<digits>", a key for this site. Datamuse's CDN caches answers by URL and echoes the Origin of
 * whoever asked first, so without it another site's (or localhost's) answer fails CORS here for a day.
 * The CDN ignores unknown parameters, so the key rides on `md` (metadata flags): digits are no flag,
 * and the answer is the same (checked 2026-11-04).
 */
function siteKey(): string {
  const origin = typeof location === "undefined" ? "" : location.origin;
  if (!origin) return "";
  let h = 5381;
  for (let i = 0; i < origin.length; i++) h = ((h * 33) ^ origin.charCodeAt(i)) >>> 0;
  return `&md=${h}`;
}

let readyMade: Set<string> | undefined;
/** The English words of the ready-made lists, cleaned and lowercased. */
const readyMadeWords = () =>
  (readyMade ??= new Set(STARTER_PACKS.flatMap((p) => p.words.map((row) => cleanEntry(row[0]).toLowerCase()))));

/**
 * Word partners, English only, at most 8: "fresh bread"-style adjectives first, then related words
 * that are themselves in a ready-made list (Datamuse's "triggered by" words are often names, songs or
 * worse: "hello" gives kitty, sailor, nasty). Each one passes the blocklist; no repeats, never the word.
 * Rejects when both Datamuse calls fail; one failing leaves the other's words.
 */
export async function fetchPartners(word: string, lang = "en"): Promise<string[]> {
  if (lang !== "en") return [];
  const base = "https://api.datamuse.com/words";
  const k = siteKey();
  const [jjb, trg] = await Promise.all([
    attempt(`${base}?rel_jjb=${enc(word)}&max=8${k}`),
    attempt(`${base}?rel_trg=${enc(word)}&max=${MAX_RELATED}${k}`),
  ]);
  if (jjb === FAILED && trg === FAILED) throw new Error("Datamuse couldn't be reached");
  const seen = new Set([cleanEntry(word).toLowerCase()]);
  const out: string[] = [];
  /** `key` is the partner's own word, so "unleavened" from both answers shows once, as "unleavened bread". */
  const add = (key: string, partner: string) => {
    if (out.length >= MAX_PARTNERS || seen.has(key) || !isCleanSentence(partner)) return;
    seen.add(key);
    out.push(partner);
  };
  for (const a of parseDatamuse(jjb)) add(cleanEntry(a).toLowerCase(), `${a} ${word}`);
  for (const w of parseDatamuse(trg, MAX_RELATED)) {
    const key = cleanEntry(w).toLowerCase();
    if (readyMadeWords().has(key)) add(key, w);
  }
  return out;
}

// ---------------------------------------------------------------- sentences

/** Tatoeba answer → sentences with the translation into `to` (a direct one first), when there is one. */
export function parseTatoeba(json: unknown, to: string): Sentence[] {
  if (!isObj(json)) return [];
  const toCode = iso3(to) ?? to;
  const out: Sentence[] = [];
  for (const s of arr(json.data).filter(isObj)) {
    const text = str(s.text);
    if (!text || s.is_unapproved === true) continue;
    const translations = arr(s.translations)
      .flat()
      .filter(isObj)
      .filter((t) => t.lang === toCode && t.is_unapproved !== true && str(t.text));
    const best = translations.find((t) => t.is_direct === true) ?? translations[0];
    const sentence: Sentence = { text, licence: str(s.license) ?? TATOEBA_LICENCE, source: "tatoeba" };
    if (best) sentence.translation = str(best.text);
    const author = str(s.owner);
    if (author) sentence.author = author;
    out.push(sentence);
  }
  return out;
}

/**
 * Real example sentences from Tatoeba, without crude or violent ones, at most 6; the ones with a human
 * translation into `to` first. Tatoeba is asked to show translations into `to`, not to require one
 * (`trans:lang=` would: Arabic then gets almost nothing), so the rest are translated on the device.
 * Rejects when Tatoeba fails.
 */
export async function fetchSentences(word: string, lang: string, to: string): Promise<Sentence[]> {
  const from = iso3(lang);
  if (!from) return [];
  const toCode = iso3(to);
  const trans = toCode ? `&showtrans:lang=${toCode}` : "";
  const url = `https://api.tatoeba.org/unstable/sentences?lang=${from}&q=${enc(word)}&sort=relevance&limit=10${trans}`;
  return parseTatoeba(await fetchJson<unknown>(url), to)
    .filter((s) => isCleanSentence(s.text) && (!s.translation || isCleanSentence(s.translation)))
    .sort((a, b) => Number(!a.translation) - Number(!b.translation))
    .slice(0, MAX_SENTENCES);
}

// ---------------------------------------------------------------- Wikipedia

const https = (src: string) => (src.startsWith("//") ? `https:${src}` : src);
/** "Bread (food)" → "bread". */
const bareTitle = (t: string) => t.replace(/\s*\([^)]*\)\s*$/, "").replace(/_/g, " ").trim().toLowerCase();

/** The Commons file page for an upload.wikimedia.org / thumb URL, if it is a Commons file. */
function commonsPage(src: string): string | undefined {
  const m = /\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(src);
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : undefined;
}

/**
 * REST summary → article. Null unless it is a standard article (not a disambiguation page) whose
 * title is the word, ignoring case and a trailing "(food)"-style qualifier.
 */
export function parseSummary(json: unknown, word: string): Article | null {
  if (!isObj(json) || json.type !== "standard") return null;
  const title = str(json.title);
  const normalized = (isObj(json.titles) && str(json.titles.normalized)) || title;
  const extract = str(json.extract);
  if (!title || !normalized || !extract || bareTitle(normalized) !== bareTitle(word)) return null;
  const urls = isObj(json.content_urls) && isObj(json.content_urls.desktop) ? json.content_urls.desktop : {};
  const lang = str(json.lang) ?? "";
  const url = str(urls.page) ?? (isLangCode(lang) ? `https://${lang}.wikipedia.org/wiki/${enc(title.replace(/ /g, "_"))}` : undefined);
  if (!url) return null;
  const article: Article = { title, extract, url, lang };
  const thumb = isObj(json.thumbnail) ? str(json.thumbnail.source) : undefined;
  const original = isObj(json.originalimage) ? str(json.originalimage.source) : undefined;
  const page = commonsPage(original ?? thumb ?? "");
  if (thumb && page) article.image = { thumb: https(thumb), page };
  return article;
}

/** action=query&prop=langlinks answer → the title in the other language. */
export function parseLanglink(json: unknown): string | null {
  if (!isObj(json) || !isObj(json.query) || !isObj(json.query.pages)) return null;
  for (const page of Object.values(json.query.pages).filter(isObj)) {
    const link = arr(page.langlinks).filter(isObj)[0];
    const title = link && str(link["*"]);
    if (title) return title;
  }
  return null;
}

/** REST media-list → pictures: images only, and only freely licensed ones from Commons. */
export function parseMediaList(json: unknown, max = 6): Picture[] {
  if (!isObj(json)) return [];
  const out: Picture[] = [];
  for (const item of arr(json.items).filter(isObj)) {
    if (item.type !== "image") continue;
    const src = str(arr(item.srcset).filter(isObj)[0]?.src);
    const page = src && commonsPage(src);
    if (!src || !page) continue;
    const picture: Picture = { thumb: https(src), page };
    const caption = isObj(item.caption) ? str(item.caption.text) : undefined;
    if (caption) picture.caption = caption;
    out.push(picture);
    if (out.length >= max) break;
  }
  return out;
}

/** Callers check the code with `isLangCode` first: it becomes part of the hostname. */
const wikipedia = (lang: string) => `https://${lang}.wikipedia.org`;
const summaryUrl = (lang: string, title: string) => `${wikipedia(lang)}/api/rest_v1/page/summary/${enc(title)}`;

/** The article in the learner's language `to` when Wikipedia links one, else null (also when that fails). */
async function articleIn(title: string, lang: string, to: string): Promise<Article | null> {
  if (to === lang || !isLangCode(to)) return null;
  const links = await attempt(
    `${wikipedia(lang)}/w/api.php?action=query&titles=${enc(title)}&prop=langlinks&lllang=${enc(to)}&format=json&origin=*`,
    WIKIPEDIA_DAYS,
  );
  const other = links === FAILED ? null : parseLanglink(links);
  if (!other) return null;
  const summary = await attempt(summaryUrl(to, other), WIKIPEDIA_DAYS);
  return summary === FAILED ? null : parseSummary(summary, other);
}

/**
 * "Did you know?" and pictures for a word: the Wikipedia article in `lang` only when it is a
 * confident match (see `parseSummary`), shown in the learner's language when one exists.
 * Pictures come from that `lang` article. No article (a 404 or a disambiguation page) gives
 * { article: null, pictures: [] }; rejects when the `lang` summary couldn't be loaded. A failed picture
 * list or translated article only leaves no pictures, or the `lang` article. A `lang` that is not a
 * language code gives no article without asking; a bad `to` gives the `lang` article.
 */
export async function fetchArticle(word: string, lang: string, to: string): Promise<{ article: Article | null; pictures: Picture[] }> {
  if (!isLangCode(lang)) return { article: null, pictures: [] };
  const article = parseSummary(await fetchJson<unknown>(summaryUrl(lang, word), WIKIPEDIA_DAYS), word);
  if (!article) return { article: null, pictures: [] };
  const [translated, media] = await Promise.all([
    articleIn(article.title, lang, to),
    attempt(`${wikipedia(lang)}/api/rest_v1/page/media-list/${enc(article.title)}`, WIKIPEDIA_DAYS),
  ]);
  return { article: translated ?? article, pictures: media === FAILED ? [] : parseMediaList(media) };
}
