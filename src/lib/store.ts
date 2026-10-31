"use client";

import { useSyncExternalStore } from "react";
import { LANGUAGES } from "./languages";
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
}

export interface Review {
  cardId: string;
  rating: number;
  reviewedAt: number;
  /** Local calendar day, YYYY-MM-DD, used for streaks and the heatmap. */
  day: string;
}

export interface Data {
  version: 1;
  decks: Deck[];
  cards: Flashcard[];
  reviews: Review[];
}

const KEY = "linguacards:v1";
const EMPTY: Data = { version: 1, decks: [], cards: [], reviews: [] };

let data: Data = EMPTY;
let loaded = false;
let saveError: string | null = null;
const listeners = new Set<() => void>();

/** JSON turns Dates into strings; ts-fsrs needs them back as Dates. */
function revive(raw: Data): Data {
  return {
    ...EMPTY,
    ...raw,
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    cards: (raw.cards ?? []).map((c) => ({
      ...c,
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
    if (raw) data = revive(JSON.parse(raw));
  } catch {
    data = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    data = e.newValue ? revive(JSON.parse(e.newValue)) : EMPTY;
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

/** Non-null when the last save to localStorage failed, so progress would be lost on reload. */
export function useSaveError(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => saveError,
    () => null,
  );
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

export async function addCard(deckId: string, front: string, back: string, src: string, tgt: string): Promise<Flashcard> {
  const card: Flashcard = {
    id: crypto.randomUUID(),
    deckId,
    front: front.trim(),
    back: back.trim(),
    src,
    tgt,
    srs: await newSrsCard(),
    createdAt: Date.now(),
  };
  set({ ...getSnapshot(), cards: [...data.cards, card] });
  return card;
}

export function updateCard(id: string, front: string, back: string) {
  set({
    ...getSnapshot(),
    cards: data.cards.map((c) => (c.id === id ? { ...c, front: front.trim(), back: back.trim() } : c)),
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
  set({
    ...d,
    cards: d.cards.map((c) => (c.id === card.id ? updated : c)),
    reviews: [...d.reviews, { cardId: card.id, rating: grade, reviewedAt: now.getTime(), day: dayKey(now) }],
  });
  return updated;
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
  set(next);
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
