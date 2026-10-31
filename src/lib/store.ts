"use client";

import { useSyncExternalStore } from "react";
import { newSrsCard, reviewSrsCard, type Grade, type SrsCard } from "./srs";
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
const listeners = new Set<() => void>();

/** JSON turns Dates into strings; ts-fsrs needs them back as Dates. */
function revive(raw: Data): Data {
  return {
    ...EMPTY,
    ...raw,
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
  } catch {
    // Quota exceeded or storage disabled: keep working in memory.
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

/** A small UI preference persisted in localStorage (e.g. last language pair). */
export function usePref(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? fallback,
    () => fallback,
  );
  const setValue = (v: string) => {
    localStorage.setItem(key, v);
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

export function deleteDeck(id: string) {
  const d = getSnapshot();
  const cardIds = new Set(d.cards.filter((c) => c.deckId === id).map((c) => c.id));
  set({
    ...d,
    decks: d.decks.filter((x) => x.id !== id),
    cards: d.cards.filter((c) => !cardIds.has(c.id)),
    reviews: d.reviews.filter((r) => !cardIds.has(r.cardId)),
  });
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
  set({ ...d, cards: d.cards.filter((c) => c.id !== id), reviews: d.reviews.filter((r) => r.cardId !== id) });
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

export function importData(json: string) {
  const parsed = JSON.parse(json) as Data;
  if (!Array.isArray(parsed.decks) || !Array.isArray(parsed.cards)) throw new Error("Not a LinguaCards backup file.");
  set(revive(parsed));
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

/** Cards due by the end of today, most overdue first. */
export function dueToday(cards: Flashcard[], deckId?: string | null): Flashcard[] {
  const limit = endOfToday();
  return cards
    .filter((c) => (!deckId || c.deckId === deckId) && dueTime(c) <= limit)
    .sort((a, b) => dueTime(a) - dueTime(b));
}
