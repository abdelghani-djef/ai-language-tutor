"use client";

import { useSyncExternalStore } from "react";
import { LANGUAGES } from "./languages";
import { DEFAULT_GOAL, DEFAULT_NEW_PER_DAY, EMPTY_REWARDS, evaluate, ROUTINES, type RewardEvent } from "./rewards";
import { newSrsCard, reviewSrsCard, State, type Grade, type SrsCard } from "./srs";
import { dayKey } from "./stats";
import { isCard, lateV1Seen, mergeLateV1, migrateV1, newSrsState, validSrs } from "./migrate";
import { isSorted, knownKey, studyCards } from "./mywords";
import { cleanName } from "./profile";
import { cleanTags } from "./tags";
import { rowOf, type StarterLang, type StarterRow } from "../data/starter-packs";
import { loadStarterWords } from "./starter-words";

// All app data lives in localStorage under one key: no database, no server.
// Components read it with useStore() and re-render whenever it changes,
// including changes made in another tab.

/** The learner's language: translations appear in it. The words studied are English. */
export type LearnerLang = StarterLang;

/** Which part of My words a word is in: Should learn, or Already know. */
export type WordStatus = "learn" | "known";

export interface Profile {
  lang: LearnerLang;
  name?: string;
  setupAt: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  src: string;
  tgt: string;
  srs: SrsCard;
  createdAt: number;
  /** A sentence using the word, in the back (target) language unless `exampleLang` says otherwise. */
  example?: string;
  exampleLang?: string;
  notes?: string;
  tags?: string[];
  /** A small picture as a data: URL, shrunk before saving to fit in localStorage. */
  image?: string;
  /** A picture for the meaning, from the starter word packs. */
  emoji?: string;
  /** The starter pack the card came from, if any. */
  pack?: string;
  /**
   * Review state for the other direction (back → front). It starts once the
   * word is known the first way: producing a word fades faster than recognising it.
   */
  srsReverse?: SrsCard;
  /**
   * When a new word was first shown. The first look isn't a recall, so it isn't
   * given to the scheduler; the first real recall follows a minute later.
   */
  introducedAt?: number;
  status: WordStatus;
  /** When it moved to Already know. */
  knownAt?: number;
  /** When it was moved back to Should learn. */
  returnedAt?: number;
}

/** How long after the first look at a new word it is asked for the first time. */
export const INTRO_DELAY = 60_000;

/** Which way a card is asked: front → back, or back → front. */
export type Direction = "forward" | "reverse";

/** One thing to study: a card asked one way, with that direction's review state. */
export interface StudyItem {
  key: string;
  card: Flashcard;
  dir: Direction;
  srs: SrsCard;
  /** Not to be asked before this time (a word just introduced). */
  waitUntil?: number;
}

/** The optional parts of a card, edited in the card editor. */
export type CardDetails = Pick<Flashcard, "example" | "notes" | "tags" | "image" | "emoji">;

export interface Review {
  cardId: string;
  rating: number;
  reviewedAt: number;
  /** Local calendar day, YYYY-MM-DD, used for streaks and the heatmap. */
  day: string;
  direction?: Direction;
  /** The first review of a new word, counted against the daily limit on new words. */
  wasNew?: boolean;
  /** A first look at a new word (shown, not recalled), so it doesn't count as a review. */
  intro?: boolean;
  /** The item's state before this review: recall rate counts only reviews after a delay. */
  prevState?: number;
}

/** An if-then plan: "When I {routine}, I will study for {minutes} minutes." */
export interface StudyPlan {
  routine: string;
  minutes: number;
}

export interface Settings {
  /** Reviews per day that count as meeting the daily goal. */
  dailyGoal: number;
  /** New words introduced per day, so reviews never pile up. */
  newPerDay: number;
  plan?: StudyPlan;
}

export interface Rewards {
  /** Badge id → when it was earned. */
  badges: Record<string, number>;
  /** Days (YYYY-MM-DD) the daily goal was met. */
  goalDays: string[];
  perfectQuizzes: number;
}

export interface Data {
  version: 2;
  profile?: Profile;
  cards: Flashcard[];
  /** Ready-made words sorted as Already know and never studied: "<lang>:<pack>:<english>" → when sorted. */
  known: Record<string, number>;
  reviews: Review[];
  settings: Settings;
  rewards: Rewards;
  /**
   * When version 1 data was moved here. A tab still running the old version
   * saves to version 1 after that; its later work is brought in (mergeLateV1).
   */
  movedFromV1At?: number;
  /**
   * The late merge's high-water mark: version 1 words created up to then were
   * already brought in (or looked at), so a word deleted here is not brought back.
   * Set to movedFromV1At by the move; raised by each merge.
   */
  lateV1Through?: number;
  /** Version 1 words looked at that were created shortly before lateV1Through: id → createdAt. */
  lateV1Seen?: Record<string, number>;
}

const KEY = "linguacards:v2";
/**
 * Version 1 data. Never written by this version: it stays as a safety copy until
 * space runs out, and is read again only for what an old-version tab saves after the move.
 */
const OLD_KEY = "linguacards:v1";
/** Version 1 preferences about lists, which no longer exist. `starter-lang` stays: setup reads it. */
const LIST_PREFS = ["linguacards:pair", "linguacards:decks", "linguacards:pack-decks"];
const EMPTY: Data = {
  version: 2,
  cards: [],
  known: {},
  reviews: [],
  settings: { dailyGoal: DEFAULT_GOAL, newPerDay: DEFAULT_NEW_PER_DAY },
  rewards: EMPTY_REWARDS,
};

let data: Data = EMPTY;
let loaded = false;
let saveError: string | null = null;
/**
 * Saved data failed to load this visit (v2 unreadable, or the move from v1
 * failed): the v1 copy may then be the only good one, so it is never dropped.
 */
let loadFailed = false;
const listeners = new Set<() => void>();

export { cleanTags, MAX_TAGS } from "./tags";

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isLearnerLang = (v: unknown): v is LearnerLang => v === "fr" || v === "ar";

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/**
 * Keeps only well-formed card details. Pictures must be data: URLs of images,
 * so a backup can't make the app load something from another site.
 */
function cleanDetails(d: Partial<Record<keyof CardDetails, unknown>>): CardDetails {
  const tags = Array.isArray(d.tags) ? cleanTags(d.tags.filter((t): t is string => typeof t === "string")) : [];
  const image = typeof d.image === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(d.image) ? d.image : undefined;
  // An emoji is a few code points at most, and never letters or markup. Keycaps
  // ("1️⃣") start with a digit, so they are checked with the keycap taken out.
  const emoji =
    typeof d.emoji === "string" &&
    d.emoji.trim() &&
    d.emoji.length <= 16 &&
    !/[\p{L}\p{N}<>]/u.test(d.emoji.replace(/[0-9#*]\uFE0F?\u20E3/gu, ""))
      ? d.emoji.trim()
      : undefined;
  return { example: text(d.example), notes: text(d.notes), tags: tags.length ? tags : undefined, image, emoji };
}

function cleanRewards(r: Partial<Rewards> | undefined): Rewards {
  const badges: Record<string, number> = {};
  if (r?.badges && typeof r.badges === "object") {
    for (const [id, at] of Object.entries(r.badges)) if (typeof at === "number") badges[id] = at;
  }
  return {
    badges,
    goalDays: Array.isArray(r?.goalDays) ? r.goalDays.filter((d) => typeof d === "string") : [],
    perfectQuizzes: typeof r?.perfectQuizzes === "number" && r.perfectQuizzes >= 0 ? r.perfectQuizzes : 0,
  };
}

const positiveInt = (v: unknown, fallback: number) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : fallback);

function cleanSettings(s: Partial<Settings> | undefined): Settings {
  const plan = s?.plan;
  return {
    dailyGoal: positiveInt(s?.dailyGoal, DEFAULT_GOAL),
    newPerDay: positiveInt(s?.newPerDay, DEFAULT_NEW_PER_DAY),
    plan:
      plan && (ROUTINES as readonly string[]).includes(plan.routine)
        ? { routine: plan.routine, minutes: positiveInt(plan.minutes, 5) }
        : undefined,
  };
}

function reviveSrs(srs: SrsCard): SrsCard {
  return { ...srs, dueAt: new Date(srs.dueAt), lastReviewAt: srs.lastReviewAt ? new Date(srs.lastReviewAt) : null };
}

/** "<lang>:<pack>:<english>", as Already know words are stored. */
const KNOWN_KEY = /^(fr|ar):[^:]+:.+$/;

function cleanTimes(v: Record<string, unknown>): Record<string, number> {
  const times: Record<string, number> = {};
  for (const [k, at] of Object.entries(v)) if (isNum(at)) times[k] = at;
  return times;
}

function cleanKnown(v: unknown): Record<string, number> {
  const known: Record<string, number> = {};
  if (isObject(v)) for (const [k, at] of Object.entries(v)) if (KNOWN_KEY.test(k) && isNum(at)) known[k] = at;
  return known;
}

function cleanProfile(v: unknown): Profile | undefined {
  if (!isObject(v) || !isLearnerLang(v.lang) || !isNum(v.setupAt)) return undefined;
  return { lang: v.lang, name: cleanName(v.name), setupAt: v.setupAt };
}

/** A saved card made safe to use. A broken review state starts again as a new word. */
function reviveCard(c: Flashcard): Flashcard {
  return {
    ...c,
    ...cleanDetails(c),
    pack: typeof c.pack === "string" ? c.pack : undefined,
    exampleLang: typeof c.exampleLang === "string" && c.exampleLang in LANGUAGES ? c.exampleLang : undefined,
    introducedAt: typeof c.introducedAt === "number" ? c.introducedAt : undefined,
    status: c.status === "known" ? "known" : "learn",
    knownAt: isNum(c.knownAt) ? c.knownAt : undefined,
    returnedAt: isNum(c.returnedAt) ? c.returnedAt : undefined,
    srs: validSrs(c.srs) ? reviveSrs(c.srs) : newSrsState(c.id, Date.now()),
    srsReverse: validSrs(c.srsReverse) ? reviveSrs(c.srsReverse) : undefined,
  };
}

/** JSON turns Dates into strings; ts-fsrs needs them back as Dates. Older data has no settings or rewards yet. */
function revive(raw: Partial<Data>): Data {
  return {
    version: 2,
    profile: cleanProfile(raw.profile),
    // Something that isn't a card (not an object, or without its words and languages) is skipped.
    cards: (Array.isArray(raw.cards) ? (raw.cards as unknown[]) : [])
      .filter(isCard)
      .map((c) => reviveCard(c as unknown as Flashcard)),
    known: cleanKnown(raw.known),
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    settings: cleanSettings(raw.settings),
    rewards: cleanRewards(raw.rewards),
    movedFromV1At: isNum(raw.movedFromV1At) ? raw.movedFromV1At : undefined,
    lateV1Through: isNum(raw.lateV1Through) ? raw.lateV1Through : undefined,
    lateV1Seen: isObject(raw.lateV1Seen) ? cleanTimes(raw.lateV1Seen) : undefined,
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = revive(parsed);
      // Data from before badges existed: award what it already qualifies for,
      // quietly, so the Stats page doesn't show earned badges as locked.
      if (parsed.rewards === undefined) {
        data = withRewards(data);
        write(data);
      }
      takeLateV1(localStorage.getItem(OLD_KEY));
    } else {
      const old = localStorage.getItem(OLD_KEY);
      if (old) moveFromV1(old);
    }
  } catch {
    data = EMPTY;
    loadFailed = true;
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      try {
        data = e.newValue ? revive(JSON.parse(e.newValue)) : EMPTY;
      } catch {
        // Unreadable data from another tab: keep what this tab has.
        return;
      }
    }
    // A tab still on the old version saved: bring in its new work.
    else if (e.key === OLD_KEY) {
      if (!takeLateV1(e.newValue)) return;
    }
    // Preferences (language, engine) changed in another tab apply here too.
    else if (!e.key?.startsWith("linguacards:")) return;
    listeners.forEach((l) => l());
  });
}

/**
 * Brings into the loaded data what a tab still running the old version saved
 * to version 1 after the move: otherwise that work would never be read.
 * Returns whether anything was added.
 */
function takeLateV1(json: string | null): boolean {
  const movedAt = data.movedFromV1At;
  if (!json || movedAt === undefined) return false;
  try {
    const merged = mergeLateV1(data, JSON.parse(json), movedAt);
    if (!merged) return false;
    data = withRewards(revive(merged));
  } catch {
    return false;
  }
  write(data);
  return true;
}

/**
 * Moves version 1 data (several lists) to version 2 (one My words list), once.
 * If anything about it fails, nothing is written or removed, so it is tried
 * again next time; the app starts empty meanwhile.
 */
function moveFromV1(old: string) {
  let moved: Data;
  try {
    const parsed = JSON.parse(old);
    const movedAt = Date.now();
    moved = {
      ...revive(migrateV1(parsed)),
      movedFromV1At: movedAt,
      lateV1Through: movedAt,
      lateV1Seen: lateV1Seen(parsed, movedAt),
    };
    if (parsed.rewards === undefined) moved = withRewards(moved);
  } catch {
    loadFailed = true;
    return;
  }
  data = moved;
  // The safety copy is never dropped to make room for the move itself: if the
  // move doesn't fit, the app runs from memory and says saving failed.
  if (!write(moved, { dropOld: false })) return;
  try {
    for (const k of LIST_PREFS) localStorage.removeItem(k);
  } catch {
    // Leftover preferences are harmless.
  }
}

/** Tries to save `json`; on failure, records why for the UI. */
function trySave(json: string): boolean {
  try {
    localStorage.setItem(KEY, json);
    saveError = null;
    return true;
  } catch (e) {
    // Quota exceeded or storage disabled: keep working in memory, but tell the user.
    saveError = e instanceof Error ? e.message : "write failed";
    return false;
  }
}

/**
 * Saves `next`. When it doesn't fit, the version 1 safety copy is dropped to
 * make room (unless `dropOld` is false) and the save tried once more; if it
 * still doesn't fit, the copy is put back. After a failed load that copy may
 * be the learner's only good data, so it stays.
 */
function write(next: Data, { dropOld = true }: { dropOld?: boolean } = {}): boolean {
  const json = JSON.stringify(next);
  if (trySave(json)) return true;
  try {
    const old = loadFailed || !dropOld ? null : localStorage.getItem(OLD_KEY);
    if (old === null) return false;
    localStorage.removeItem(OLD_KEY);
    if (trySave(json)) return true;
    localStorage.setItem(OLD_KEY, old);
  } catch {
    // Storage unavailable: saveError already says the save failed.
  }
  return false;
}

function set(next: Data) {
  data = next;
  write(next);
  listeners.forEach((l) => l());
}

// Told about new badges and a reached daily goal, so the UI can celebrate.
const rewardListeners = new Set<(e: RewardEvent) => void>();

export function onReward(l: (e: RewardEvent) => void): () => void {
  rewardListeners.add(l);
  return () => rewardListeners.delete(l);
}

/** `d` with any goal or badges it qualifies for, without celebrating. */
function withRewards(d: Data): Data {
  const result = evaluate(d);
  return result ? { ...d, rewards: result.rewards } : d;
}

/** Saves `next`, plus any goal or badges it earns. Returns whether anything was earned. */
function setAndReward(next: Data): boolean {
  const result = evaluate(next);
  set(result ? { ...next, rewards: result.rewards } : next);
  if (result) rewardListeners.forEach((l) => l(result.event));
  return !!result;
}

/** Calls `l` whenever the data or a preference changes, here or in another tab. Returns a function that stops it. */
export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): Data {
  load();
  return data;
}

/** Test-only: forgets the in-memory state and loads again from the current localStorage. */
export function __resetForTests(): Data {
  data = EMPTY;
  loaded = false;
  saveError = null;
  loadFailed = false;
  return getSnapshot();
}

export function useStore(): Data {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

/** False during server render and the first client render, so pages can avoid flashing empty states. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** Whether the most recent write failed to reach localStorage (it is kept in memory). */
export function saveFailed(): boolean {
  return saveError !== null;
}

/** Non-null when the last save to localStorage failed, so progress would be lost on reload. */
export function useSaveError(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => saveError,
    () => null,
  );
}

// Re-renders at local midnight and when the tab comes back into view, so
// "today" (goal progress, streak) doesn't stay stuck on yesterday.
function subscribeToday(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 1, 0);
    timer = setTimeout(() => {
      onChange();
      arm();
    }, next.getTime() - now.getTime());
  };
  arm();
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** Today's local day key (YYYY-MM-DD); empty during server render. */
export function useToday(): string {
  return useSyncExternalStore(subscribeToday, () => dayKey(new Date()), () => "");
}

// Fallback when localStorage is blocked, so preferences still work for this visit.
const memPrefs = new Map<string, string>();

/** A small UI preference persisted in localStorage (e.g. last language pair). */
export function usePref(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? memPrefs.get(key) ?? fallback;
      } catch {
        return memPrefs.get(key) ?? fallback;
      }
    },
    () => fallback,
  );
  const setValue = (v: string) => {
    memPrefs.set(key, v);
    try {
      localStorage.setItem(key, v);
    } catch {
      // Storage blocked: the in-memory value is used instead.
    }
    listeners.forEach((l) => l());
  };
  return [value, setValue];
}

// ---------- actions ----------

/** A card shown in `lang`: an English word with its translation in that language. */
const inLang = (c: Flashcard, lang: LearnerLang) => c.src === "en" && c.tgt === lang;

/**
 * What switching to `lang` deletes: the words in any other language, and the
 * ready-made words marked Already know in another language.
 */
export function otherLanguageData(d: Pick<Data, "cards" | "known">, lang: LearnerLang): { words: number; known: number } {
  return {
    words: d.cards.filter((c) => !inLang(c, lang)).length,
    known: Object.keys(d.known).filter((k) => !k.startsWith(`${lang}:`)).length,
  };
}

/**
 * Sets the learner's language and name. A name left out keeps the current one;
 * an empty one clears it. The first setup time is kept. Not studying: it writes
 * no review and earns nothing.
 *
 * Changing the language of an existing profile starts that language afresh: it
 * deletes every word in another language and the other languages' Already know
 * marks (see otherLanguageData). Reviews, streak and badges stay. The first
 * setup deletes nothing: there is no previous language yet.
 */
export function setProfile(p: { lang: LearnerLang; name?: string }) {
  const d = getSnapshot();
  const name = p.name === undefined ? d.profile?.name : cleanName(p.name);
  const profile = { lang: p.lang, name, setupAt: d.profile?.setupAt ?? Date.now() };
  if (!d.profile || d.profile.lang === p.lang) {
    set({ ...d, profile });
    return;
  }
  set({
    ...d,
    profile,
    cards: d.cards.filter((c) => inLang(c, p.lang)),
    known: Object.fromEntries(Object.entries(d.known).filter(([k]) => k.startsWith(`${p.lang}:`))),
  });
}

/** A new word, in Should learn. */
export async function addCard(
  front: string,
  back: string,
  src: string,
  tgt: string,
  details: CardDetails = {},
  extra: { pack?: string; exampleLang?: string } = {},
): Promise<Flashcard> {
  const card = await makeCard(front, back, src, tgt, details, extra);
  set({ ...getSnapshot(), cards: [...data.cards, card] });
  return card;
}

/** A new word in Should learn, not saved yet. */
async function makeCard(
  front: string,
  back: string,
  src: string,
  tgt: string,
  details: CardDetails,
  extra: { pack?: string; exampleLang?: string },
): Promise<Flashcard> {
  return {
    id: crypto.randomUUID(),
    front: front.trim(),
    back: back.trim(),
    src,
    tgt,
    srs: await newSrsCard(),
    createdAt: Date.now(),
    pack: extra.pack,
    exampleLang: extra.exampleLang,
    status: "learn",
    ...cleanDetails(details),
  };
}

/**
 * Changes a card's text and details. Details left out of `details` are removed.
 * A ready-made word keeps its English word: the list knows the word by it.
 */
export function updateCard(id: string, front: string, back: string, details: CardDetails = {}) {
  set({
    ...getSnapshot(),
    cards: data.cards.map((c) =>
      c.id === id ? { ...c, front: c.pack ? c.front : front.trim(), back: back.trim(), ...cleanDetails(details) } : c,
    ),
  });
}

// Deleting cards keeps their review log entries: they record days you studied,
// so streaks and the heatmap don't change after the fact.
export function deleteCard(id: string) {
  const d = getSnapshot();
  set({ ...d, cards: d.cards.filter((c) => c.id !== id) });
}

/** Undo for deleteCard: puts the card back unless it is there already. */
export function restoreCard(card: Flashcard) {
  const d = getSnapshot();
  if (d.cards.some((c) => c.id === card.id)) return;
  set({ ...d, cards: [...d.cards, card] });
}

function startOfTomorrow(now: Date): Date {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d;
}

export async function gradeCard(
  card: Flashcard,
  grade: Grade,
  dir: Direction = "forward",
  { intro = false }: { intro?: boolean } = {},
): Promise<Flashcard> {
  const now = new Date();
  const srs = dir === "reverse" && card.srsReverse ? card.srsReverse : card.srs;
  // A first look leaves the review state alone: the first real recall is its first rating.
  const next = intro ? srs : await reviewSrsCard(srs, grade, now);
  const updated: Flashcard = intro
    ? { ...card, introducedAt: now.getTime() }
    : dir === "reverse"
      ? { ...card, srsReverse: next }
      : { ...card, srs: next };
  // A word moved back from Already know was chosen by the learner: it doesn't use the daily limit on new words.
  const startsWord =
    dir === "forward" && srs.state === State.New && (intro || !card.introducedAt) && !card.returnedAt;
  // Once the word is known one way, start asking it the other way, from tomorrow
  // so it isn't crammed into the same sitting.
  if (dir === "forward" && !card.srsReverse && next.state === State.Review) {
    updated.srsReverse = await newSrsCard(startOfTomorrow(now));
  }
  // A word moved back to Should learn was just forgotten: it can't graduate again the same day.
  const returnedToday = !!card.returnedAt && dayKey(new Date(card.returnedAt)) >= dayKey(now);
  if (updated.status === "learn" && !returnedToday && isLearnedWell(updated, now.getTime())) {
    updated.status = "known";
    updated.knownAt = now.getTime();
  }
  const d = getSnapshot();
  setAndReward({
    ...d,
    cards: d.cards.map((c) => (c.id === card.id ? updated : c)),
    reviews: [
      ...d.reviews,
      {
        cardId: card.id,
        rating: grade,
        reviewedAt: now.getTime(),
        day: dayKey(now),
        direction: dir,
        wasNew: startsWord || undefined,
        intro: intro || undefined,
        prevState: srs.state,
      },
    ],
  });
  return updated;
}

/** A Should learn word moves to Already know by itself once both directions are due at least this many days ahead. */
export const GRADUATE_DAYS = 21;

const DAY_MS = 86_400_000;

/** Whether both directions are in Review and due at least `GRADUATE_DAYS` days after `now`. */
export function isLearnedWell(c: Flashcard, now = Date.now()): boolean {
  const far = (s: SrsCard | undefined) =>
    !!s && s.state === State.Review && new Date(s.dueAt).getTime() >= now + GRADUATE_DAYS * DAY_MS;
  return far(c.srs) && far(c.srsReverse);
}

const sameWord = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The card a ready-made word becomes in Should learn, as the words page made it. */
function makePackCard(pack: string, row: StarterRow, lang: LearnerLang): Promise<Flashcard> {
  const [en, fr, ar, emoji, example] = row;
  return makeCard(en, lang === "fr" ? fr : ar, "en", lang, { example, emoji: emoji || undefined }, { pack, exampleLang: "en" });
}

/** The learner's card for a ready-made word, in their language. */
function packCardOf(d: Data, lang: LearnerLang, pack: string, word: string): Flashcard | undefined {
  return d.cards.find((c) => c.pack === pack && c.src === "en" && c.tgt === lang && sameWord(c.front, word));
}

function withoutKey(known: Record<string, number>, key: string): Record<string, number> {
  const next = { ...known };
  delete next[key];
  return next;
}

// Sorting actions run one after another, so a second tap on the same word finds
// it sorted already and does nothing.
let sortChain: Promise<void> = Promise.resolve();

function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = sortChain.then(task);
  sortChain = run.then(
    () => {},
    () => {},
  );
  return run;
}

/**
 * Sorts a ready-made word: Already know marks it in `known` (no card), Should
 * learn makes its card. Does nothing if it is sorted already or there is no
 * profile yet. Sorting is not studying: no review, no rewards. Rejects when the
 * lists' words can't be loaded (nothing is saved then).
 */
export function sortWord(pack: string, word: string, choice: WordStatus): Promise<void> {
  return inTurn(async () => {
    const words = await loadStarterWords();
    const lang = getSnapshot().profile?.lang;
    const row = rowOf(words, pack, word);
    if (!lang || !row || isSorted(getSnapshot(), pack, word, words)) return;
    if (choice === "known") {
      const d = getSnapshot();
      set({ ...d, known: { ...d.known, [knownKey(lang, pack, word)]: Date.now() } });
      return;
    }
    const card = await makePackCard(pack, row, lang);
    const d = getSnapshot();
    set({ ...d, cards: [...d.cards, card] });
  });
}

/**
 * Undo for sortWord, meant only straight after it: removes the `known` mark, or
 * the word's card if nobody has looked at it yet. It runs in turn with sortWord,
 * so an Undo tapped while the card is still being made removes that card. A
 * card moved back from Already know (`returnedAt`) is left alone: removing it
 * would take the word out of both parts.
 */
export function unsortWord(pack: string, word: string): Promise<void> {
  return inTurn(async () => {
    const d = getSnapshot();
    const lang = d.profile?.lang;
    if (!lang) return;
    const key = knownKey(lang, pack, word);
    const card = packCardOf(d, lang, pack, word);
    const drop =
      card && card.srs.state === State.New && !card.introducedAt && !card.returnedAt ? card.id : undefined;
    if (typeof d.known[key] !== "number" && !drop) return;
    set({ ...d, known: withoutKey(d.known, key), cards: drop ? d.cards.filter((c) => c.id !== drop) : d.cards });
  });
}

/**
 * Moves a card to Already know or back to Should learn. Moved back, a studied
 * word comes up today in both directions; a word not started stays new. Not studying: no review, no rewards.
 */
export function setStatus(cardId: string, status: WordStatus) {
  const d = getSnapshot();
  const card = d.cards.find((c) => c.id === cardId);
  if (!card || card.status === status) return;
  const now = Date.now();
  let moved: Flashcard;
  if (status === "known") moved = { ...card, status, knownAt: now };
  else {
    const dueNow = (s: SrsCard): SrsCard => ({ ...s, dueAt: new Date(now) });
    moved = {
      ...card,
      status,
      returnedAt: now,
      srs: card.srs.state === State.New ? card.srs : dueNow(card.srs),
      srsReverse: card.srsReverse && dueNow(card.srsReverse),
    };
  }
  set({ ...d, cards: d.cards.map((c) => (c.id === cardId ? moved : c)) });
}

/**
 * Moves a ready-made word sorted as Already know (a `known` mark) back to
 * Should learn: the mark becomes a new card, studied without the daily limit.
 * Resolves to whether it moved anything (not when the mark is gone already, say moved in another tab).
 * Rejects when the lists' words can't be loaded.
 */
export function learnKnownWord(pack: string, word: string): Promise<boolean> {
  return inTurn(async () => {
    const words = await loadStarterWords();
    const lang = getSnapshot().profile?.lang;
    const row = rowOf(words, pack, word);
    if (!lang || !row) return false;
    const key = knownKey(lang, pack, word);
    if (typeof getSnapshot().known[key] !== "number") return false;
    // A card for the word already stands for it: only the mark goes.
    const card = packCardOf(getSnapshot(), lang, pack, word) ? undefined : await makePackCard(pack, row, lang);
    const d = getSnapshot();
    set({
      ...d,
      known: withoutKey(d.known, key),
      cards: card ? [...d.cards, { ...card, returnedAt: Date.now() }] : d.cards,
    });
    return true;
  });
}

/** Several new words in one save, in Should learn, kept in the given order (e.g. most frequent word first). */
export async function addCards(
  src: string,
  tgt: string,
  items: { front: string; back: string; details?: CardDetails; pack?: string; exampleLang?: string }[],
): Promise<Flashcard[]> {
  const base = Date.now();
  const made: Flashcard[] = [];
  for (const [i, item] of items.entries()) {
    made.push({
      id: crypto.randomUUID(),
      front: item.front.trim(),
      back: item.back.trim(),
      src,
      tgt,
      srs: await newSrsCard(),
      // Spread by a millisecond each, so "oldest first" follows the list order.
      createdAt: base + i,
      pack: item.pack,
      exampleLang: item.exampleLang,
      status: "learn",
      ...cleanDetails(item.details ?? {}),
    });
  }
  set({ ...getSnapshot(), cards: [...data.cards, ...made] });
  return made;
}

export function setNewPerDay(n: number) {
  const d = getSnapshot();
  set({ ...d, settings: { ...d.settings, newPerDay: n } });
}

export function setPlan(plan: StudyPlan | undefined) {
  const d = getSnapshot();
  set({ ...d, settings: { ...d.settings, plan } });
}

/** New words already started today, which count against the daily limit. */
export function newStartedOn(reviews: Review[], day: string): number {
  return reviews.filter((r) => r.day === day && r.wasNew).length;
}

/** Lowering the goal can meet it straight away, which counts. */
export function setDailyGoal(goal: number) {
  const d = getSnapshot();
  setAndReward({ ...d, settings: { ...d.settings, dailyGoal: goal } });
}

/**
 * Quizzes don't touch the review schedule; a perfect one counts toward badges.
 * Returns whether that earned a badge (which is celebrated already).
 */
export function recordQuiz(score: number, total: number): boolean {
  if (total === 0 || score < total) return false;
  const d = getSnapshot();
  return setAndReward({ ...d, rewards: { ...d.rewards, perfectQuizzes: d.rewards.perfectQuizzes + 1 } });
}

export function exportData(): string {
  return JSON.stringify(getSnapshot(), null, 2);
}

const isLang = (v: unknown) => isStr(v) && v in LANGUAGES;

/** A backup's card: version 1 cards also name their list. */
function validCard(v: unknown, v1: boolean): boolean {
  if (!isObject(v)) return false;
  const srs = v.srs as Partial<Record<keyof SrsCard, unknown>> | null | undefined;
  return (
    isStr(v.id) &&
    (!v1 || isStr(v.deckId)) &&
    isStr(v.front) &&
    isStr(v.back) &&
    isLang(v.src) &&
    isLang(v.tgt) &&
    isObject(srs) &&
    !Number.isNaN(new Date(srs.dueAt as string).getTime()) &&
    isNum(srs.state) &&
    isNum(srs.stability) &&
    isNum(srs.difficulty)
  );
}

/**
 * Parses and checks a backup file without changing anything, so the caller can
 * show what it contains before replacing the current data with importData().
 * A version 1 backup (several lists) goes through the same move as saved data.
 */
export function parseBackup(json: string): Data {
  const invalid = new Error("Not a valid LinguaCards backup file.");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw invalid;
  }
  if (!isObject(raw) || !Array.isArray(raw.cards)) throw invalid;
  const v1 = raw.version !== 2;
  const reviews = raw.reviews ?? [];
  if (!Array.isArray(reviews)) throw invalid;
  if (v1) {
    if (!Array.isArray(raw.decks)) throw invalid;
    for (const d of raw.decks) {
      if (!isObject(d) || !isStr(d.id) || !isStr(d.name) || !isLang(d.src) || !isLang(d.tgt)) throw invalid;
    }
  } else if (!isObject(raw.known)) throw invalid;
  for (const c of raw.cards) if (!validCard(c, v1)) throw invalid;
  for (const r of reviews) {
    if (!isObject(r) || !isStr(r.day) || !isNum(r.rating) || !isNum(r.reviewedAt)) throw invalid;
  }
  const checked = { ...raw, reviews };
  return revive(v1 ? migrateV1(checked) : (checked as Partial<Data>));
}

/**
 * Replaces all data with a parsed backup. A backup without a profile keeps the
 * current one. Returns false if it could not be saved to storage.
 */
export function importData(next: Data): boolean {
  // Older backups have no badges yet; fill them in without a celebration.
  // Work a tab on the old version saves later is not mixed into the backup.
  set(
    withRewards({
      ...next,
      profile: next.profile ?? getSnapshot().profile,
      movedFromV1At: undefined,
      lateV1Through: undefined,
      lateV1Seen: undefined,
    }),
  );
  return saveError === null;
}

// ---------- selectors ----------

export function endOfToday(now = new Date()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function dueTime(item: { srs: SrsCard; waitUntil?: number }): number {
  return Math.max(new Date(item.srs.dueAt).getTime(), item.waitUntil ?? 0);
}

/**
 * Whether something can be studied now. New and Review items are available for
 * their whole due day (FSRS schedules them to the minute, but a day is the
 * unit people think in); Learning/Relearning steps wait for their exact time.
 */
export function isDue(
  item: { srs: SrsCard; waitUntil?: number },
  now = Date.now(),
  dayEnd = endOfToday(new Date(now)),
): boolean {
  if (item.waitUntil && item.waitUntil > now) return false;
  const t = dueTime(item);
  if (t <= now) return true;
  const inStep = item.srs.state === State.Learning || item.srs.state === State.Relearning;
  return !inStep && t <= dayEnd;
}

/** A card's study items: always front → back, and back → front once that has started. */
export function itemsOf(card: Flashcard): StudyItem[] {
  const forward: StudyItem = { key: `${card.id}:f`, card, dir: "forward", srs: card.srs };
  // A word just shown for the first time is asked a minute later.
  if (card.srs.state === State.New && card.introducedAt) forward.waitUntil = card.introducedAt + INTRO_DELAY;
  const items: StudyItem[] = [forward];
  if (card.srsReverse) items.push({ key: `${card.id}:r`, card, dir: "reverse", srs: card.srsReverse });
  return items;
}

/** A new word nobody has looked at yet. */
const notStarted = (i: StudyItem) => i.dir === "forward" && i.srs.state === State.New && !i.card.introducedAt;

/** Started items (everything but words not yet shown) that pass `keep`, soonest first. */
export function startedItems(cards: Flashcard[], keep: (i: StudyItem) => boolean): StudyItem[] {
  return cards
    .flatMap(itemsOf)
    .filter((i) => !notStarted(i) && keep(i))
    .sort((a, b) => dueTime(a) - dueTime(b));
}

/** Reviews (not new words) that can be studied now, most overdue first. */
export function dueReviews(cards: Flashcard[], now = Date.now()): StudyItem[] {
  return startedItems(cards, (i) => isDue(i, now));
}

/** A word nobody has looked at yet. */
const unseen = (c: Flashcard) => c.srs.state === State.New && !c.introducedAt;

/**
 * New words not started yet, in the order they were added (starter packs: most
 * frequent first). Words moved back to Should learn are left to `returnedWords`.
 */
export function newWords(cards: Flashcard[]): Flashcard[] {
  return cards.filter((c) => unseen(c) && !c.returnedAt).sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * New words moved back from Already know, not started yet, oldest return first.
 * The learner chose them, so the daily limit on new words doesn't hold them back.
 */
export function returnedWords(cards: Flashcard[]): Flashcard[] {
  return cards.filter((c) => unseen(c) && !!c.returnedAt).sort((a, b) => a.returnedAt! - b.returnedAt!);
}

/**
 * How many items are waiting today in the learner's language (in `list` if
 * given): due reviews, returned words, and the new words today's limit still allows.
 */
export function dueCount(
  d: Pick<Data, "cards" | "reviews" | "settings" | "profile">,
  today: string,
  list?: string | null,
): number {
  const sc = studyCards(d, list);
  const left = Math.max(0, d.settings.newPerDay - newStartedOn(d.reviews, today));
  return dueReviews(sc).length + returnedWords(sc).length + Math.min(left, newWords(sc).length);
}

/** Case-insensitive tag match; no tag means every card. */
export function hasTag(c: Flashcard, tag: string | null | undefined): boolean {
  if (!tag) return true;
  const key = tag.toLocaleLowerCase();
  return !!c.tags?.some((t) => t.toLocaleLowerCase() === key);
}
