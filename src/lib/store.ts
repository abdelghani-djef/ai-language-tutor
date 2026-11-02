"use client";

import { useSyncExternalStore } from "react";
import { LANGUAGES } from "./languages";
import { DEFAULT_GOAL, EMPTY_REWARDS, evaluate, type RewardEvent } from "./rewards";
import { newSrsCard, reviewSrsCard, State, type Grade, type SrsCard } from "./srs";
import { dayKey } from "./stats";

// All app data lives in localStorage under one key: no database, no server.
// Components read it with useStore() and re-render whenever it changes,
// including changes made in another tab.

export interface Deck {
  id: string;
  name: string;
  src: string;
  tgt: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  src: string;
  tgt: string;
  srs: SrsCard;
  createdAt: number;
  /** A sentence using the word, in the back (target) language. */
  example?: string;
  notes?: string;
  tags?: string[];
  /** A small picture as a data: URL, shrunk before saving to fit in localStorage. */
  image?: string;
}

/** The optional parts of a card, edited in the card editor. */
export type CardDetails = Pick<Flashcard, "example" | "notes" | "tags" | "image">;

export interface Review {
  cardId: string;
  rating: number;
  reviewedAt: number;
  /** Local calendar day, YYYY-MM-DD, used for streaks and the heatmap. */
  day: string;
}

export interface Settings {
  /** Reviews per day that count as meeting the daily goal. */
  dailyGoal: number;
}

export interface Rewards {
  /** Badge id → when it was earned. */
  badges: Record<string, number>;
  /** Days (YYYY-MM-DD) the daily goal was met. */
  goalDays: string[];
  perfectQuizzes: number;
}

export interface Data {
  version: 1;
  decks: Deck[];
  cards: Flashcard[];
  reviews: Review[];
  settings: Settings;
  rewards: Rewards;
}

const KEY = "linguacards:v1";
const EMPTY: Data = {
  version: 1,
  decks: [],
  cards: [],
  reviews: [],
  settings: { dailyGoal: DEFAULT_GOAL },
  rewards: EMPTY_REWARDS,
};

let data: Data = EMPTY;
let loaded = false;
let saveError: string | null = null;
const listeners = new Set<() => void>();

export const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

/** Trims tags, drops "#", empties and case-insensitive duplicates. */
export function cleanTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/**
 * Keeps only well-formed card details. Pictures must be data: URLs of images,
 * so a backup can't make the app load something from another site.
 */
function cleanDetails(d: Partial<Record<keyof CardDetails, unknown>>): CardDetails {
  const tags = Array.isArray(d.tags) ? cleanTags(d.tags.filter((t): t is string => typeof t === "string")) : [];
  const image = typeof d.image === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(d.image) ? d.image : undefined;
  return { example: text(d.example), notes: text(d.notes), tags: tags.length ? tags : undefined, image };
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

function cleanSettings(s: Partial<Settings> | undefined): Settings {
  const goal = s?.dailyGoal;
  return { dailyGoal: typeof goal === "number" && Number.isInteger(goal) && goal > 0 ? goal : DEFAULT_GOAL };
}

/** JSON turns Dates into strings; ts-fsrs needs them back as Dates. Older data has no settings or rewards yet. */
function revive(raw: Data): Data {
  return {
    ...EMPTY,
    ...raw,
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    settings: cleanSettings(raw.settings),
    rewards: cleanRewards(raw.rewards),
    cards: (raw.cards ?? []).map((c) => ({
      ...c,
      ...cleanDetails(c),
      srs: {
        ...c.srs,
        dueAt: new Date(c.srs.dueAt),
        lastReviewAt: c.srs.lastReviewAt ? new Date(c.srs.lastReviewAt) : null,
      },
    })),
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
        localStorage.setItem(KEY, JSON.stringify(data));
      }
    }
  } catch {
    data = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) data = e.newValue ? revive(JSON.parse(e.newValue)) : EMPTY;
    // Preferences (language, pair, engine) changed in another tab apply here too.
    else if (!e.key?.startsWith("linguacards:")) return;
    listeners.forEach((l) => l());
  });
}

function set(next: Data) {
  data = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    saveError = null;
  } catch (e) {
    // Quota exceeded or storage disabled: keep working in memory, but tell the user.
    saveError = e instanceof Error ? e.message : "write failed";
  }
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

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): Data {
  load();
  return data;
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

export function createDeck(name: string, src: string, tgt: string): Deck {
  const deck: Deck = { id: crypto.randomUUID(), name: name.trim(), src, tgt, createdAt: Date.now() };
  set({ ...getSnapshot(), decks: [...data.decks, deck] });
  return deck;
}

export function renameDeck(id: string, name: string) {
  set({ ...getSnapshot(), decks: data.decks.map((d) => (d.id === id ? { ...d, name: name.trim() } : d)) });
}

// Deleting cards keeps their review log entries: they record days you studied,
// so streaks and the heatmap don't change after the fact.
export function deleteDeck(id: string) {
  const d = getSnapshot();
  set({ ...d, decks: d.decks.filter((x) => x.id !== id), cards: d.cards.filter((c) => c.deckId !== id) });
}

export async function addCard(
  deckId: string,
  front: string,
  back: string,
  src: string,
  tgt: string,
  details: CardDetails = {},
): Promise<Flashcard> {
  const card: Flashcard = {
    id: crypto.randomUUID(),
    deckId,
    front: front.trim(),
    back: back.trim(),
    src,
    tgt,
    srs: await newSrsCard(),
    createdAt: Date.now(),
    ...cleanDetails(details),
  };
  set({ ...getSnapshot(), cards: [...data.cards, card] });
  return card;
}

/** Changes a card's text and details. Details left out of `details` are removed. */
export function updateCard(id: string, front: string, back: string, details: CardDetails = {}) {
  set({
    ...getSnapshot(),
    cards: data.cards.map((c) =>
      c.id === id ? { ...c, front: front.trim(), back: back.trim(), ...cleanDetails(details) } : c,
    ),
  });
}

export function deleteCard(id: string) {
  const d = getSnapshot();
  set({ ...d, cards: d.cards.filter((c) => c.id !== id) });
}

/** Undo for deleteCard: puts the card back if its deck still exists. */
export function restoreCard(card: Flashcard) {
  const d = getSnapshot();
  if (d.cards.some((c) => c.id === card.id) || !d.decks.some((x) => x.id === card.deckId)) return;
  set({ ...d, cards: [...d.cards, card] });
}

export async function gradeCard(card: Flashcard, grade: Grade): Promise<Flashcard> {
  const now = new Date();
  const updated = { ...card, srs: await reviewSrsCard(card.srs, grade, now) };
  const d = getSnapshot();
  setAndReward({
    ...d,
    cards: d.cards.map((c) => (c.id === card.id ? updated : c)),
    reviews: [...d.reviews, { cardId: card.id, rating: grade, reviewedAt: now.getTime(), day: dayKey(now) }],
  });
  return updated;
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

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isLang = (v: unknown) => isStr(v) && v in LANGUAGES;

/**
 * Parses and checks a backup file without changing anything, so the caller can
 * show what it contains before replacing the current data with importData().
 */
export function parseBackup(json: string): Data {
  const invalid = new Error("Not a valid LinguaCards backup file.");
  let raw: Partial<Data>;
  try {
    raw = JSON.parse(json);
  } catch {
    throw invalid;
  }
  if (!raw || !Array.isArray(raw.decks) || !Array.isArray(raw.cards)) throw invalid;
  const reviews = raw.reviews ?? [];
  if (!Array.isArray(reviews)) throw invalid;
  for (const d of raw.decks) {
    if (!d || !isStr(d.id) || !isStr(d.name) || !isLang(d.src) || !isLang(d.tgt)) throw invalid;
  }
  for (const c of raw.cards) {
    const ok =
      c &&
      isStr(c.id) &&
      isStr(c.deckId) &&
      isStr(c.front) &&
      isStr(c.back) &&
      isLang(c.src) &&
      isLang(c.tgt) &&
      c.srs &&
      !Number.isNaN(new Date(c.srs.dueAt).getTime()) &&
      isNum(c.srs.state) &&
      isNum(c.srs.stability) &&
      isNum(c.srs.difficulty);
    if (!ok) throw invalid;
  }
  for (const r of reviews) {
    if (!r || !isStr(r.day) || !isNum(r.rating) || !isNum(r.reviewedAt)) throw invalid;
  }
  return revive({ ...(raw as Data), version: 1, reviews });
}

/** Replaces all data with a parsed backup. Returns false if it could not be saved to storage. */
export function importData(next: Data): boolean {
  // Older backups have no badges yet; fill them in without a celebration.
  set(withRewards(next));
  return saveError === null;
}

// ---------- selectors ----------

export function endOfToday(now = new Date()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function dueTime(c: Flashcard): number {
  return new Date(c.srs.dueAt).getTime();
}

/**
 * Whether a card can be studied now. New and Review cards are available for
 * their whole due day (FSRS schedules them to the minute, but a day is the
 * unit people think in); Learning/Relearning steps wait for their exact time.
 */
export function isDue(c: Flashcard, now = Date.now(), dayEnd = endOfToday(new Date(now))): boolean {
  const t = dueTime(c);
  if (t <= now) return true;
  const inStep = c.srs.state === State.Learning || c.srs.state === State.Relearning;
  return !inStep && t <= dayEnd;
}

/** Cards that can be studied now, most overdue first. */
export function dueToday(cards: Flashcard[], deckId?: string | null, now = Date.now()): Flashcard[] {
  return cards
    .filter((c) => (!deckId || c.deckId === deckId) && isDue(c, now))
    .sort((a, b) => dueTime(a) - dueTime(b));
}

/** Case-insensitive tag match; no tag means every card. */
export function hasTag(c: Flashcard, tag: string | null | undefined): boolean {
  if (!tag) return true;
  const key = tag.toLocaleLowerCase();
  return !!c.tags?.some((t) => t.toLocaleLowerCase() === key);
}
