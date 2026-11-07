import type { SrsCard } from "./srs";
import type { Data, Direction, Flashcard, Review, Rewards, Settings, WordStatus } from "./store";
import { cleanTags } from "./tags";

// The move from version 1 (many lists) to version 2 (one My words list).
// Pure and synchronous: it never reads or writes storage. Dates in review
// states stay as they came (strings from JSON); the store's revive turns them
// back into Dates. Running it again on its own output changes nothing.

/** Saved data from version 1, as parsed from JSON. Nothing in it is trusted. */
export interface V1Data {
  decks?: unknown[];
  cards?: unknown[];
  reviews?: unknown[];
  settings?: unknown;
  rewards?: unknown;
  /** Present when the input is already version 2 output. */
  known?: unknown;
}

/** A version 1 card: it belonged to a list and had no status yet. */
type V1Card = Omit<Flashcard, "status"> & { deckId?: unknown; status?: unknown };

/**
 * What makes two cards the same word. A ready-made word is its list plus its
 * English word; a word typed by the learner is its English word plus its
 * translation, both lowercased. Both languages are part of the key, so the
 * same spelling in an en→ar list and a fr→ar list stays two words.
 */
export function sameWordKey(c: Pick<Flashcard, "pack" | "front" | "back" | "src" | "tgt">): string {
  const pair = `${c.src}>${c.tgt}`;
  return c.pack ? `${pair}|${c.pack}|${c.front}` : `${pair}|own|${c.front.toLowerCase()}|${c.back.toLowerCase()}`;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStatus = (v: unknown): v is WordStatus => v === "learn" || v === "known";
const isString = (v: unknown): v is string => typeof v === "string";
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** A card with the words and languages every step below relies on. */
export const isCard = (v: unknown): v is Record<string, unknown> =>
  isObject(v) && isString(v.front) && isString(v.back) && isString(v.src) && isString(v.tgt);

/**
 * A review state at New, built without the (async) scheduler, with exactly the
 * keys a newSrsCard() result has. The store uses it too, for a broken saved state.
 */
export function newSrsState(cardId: string | number, now: number): SrsCard {
  return {
    stability: 0,
    stabilityFast: 0,
    difficulty: 0,
    state: 0,
    scheduleStatus: "new",
    dueAt: new Date(now),
    lastReviewAt: null,
    cardId,
    reps: 0,
    lapses: 0,
    scheduledDays: 0,
    learningStep: 0,
  };
}

/** A review state with what scheduling relies on: a due date and numbers for state, stability and difficulty. */
export function validSrs(v: unknown): v is SrsCard {
  if (!isObject(v)) return false;
  return (
    !Number.isNaN(new Date(v.dueAt as string).getTime()) &&
    typeof v.state === "number" &&
    typeof v.stability === "number" &&
    typeof v.difficulty === "number"
  );
}

/** The new forward state of a turned word, with its own id so the two directions don't share the scheduler's random spread. */
const freshForward = (from: SrsCard | undefined, cardId: string, now: number) =>
  newSrsState(`${from?.cardId ?? cardId}-f`, now);

const flipDirection = (d: Direction | undefined): Direction => (d === "reverse" ? "forward" : "reverse");

export function migrateV1(raw: V1Data, now = Date.now()): Omit<Data, "profile"> {
  const deckNames = new Map<unknown, string>();
  for (const d of list(raw.decks)) {
    if (isObject(d) && typeof d.name === "string") deckNames.set(d.id, d.name);
  }

  // 1. Turn words stored the other way round (X → English) English-first.
  const flipped = new Set<string>();
  const cards = list(raw.cards).filter(isCard).map((input) => {
    const c = { ...(input as V1Card) };
    // Tags that aren't a list of words are dropped.
    const ownTags = Array.isArray(c.tags) ? c.tags.filter(isString) : undefined;
    if (ownTags?.length) c.tags = ownTags;
    else delete c.tags;
    // A card with a broken review state is kept, as a new word.
    if (!validSrs(c.srs)) c.srs = newSrsState(c.id, now);
    if (c.srsReverse !== undefined && !validSrs(c.srsReverse)) delete c.srsReverse;
    if (c.tgt === "en" && c.src !== "en") {
      flipped.add(c.id);
      [c.front, c.back] = [c.back, c.front];
      [c.src, c.tgt] = [c.tgt, c.src];
      // The example used to be in the back language, which was English.
      c.exampleLang = c.exampleLang ?? "en";
      const started = (c.srs?.state ?? 0) !== 0 || c.introducedAt !== undefined;
      if (started) {
        const oldForward = c.srs;
        if (c.srsReverse) c.srs = c.srsReverse;
        else {
          // The English-first side was never asked: it starts as a new word,
          // with a first look and the daily limit, so it doesn't all come due at once.
          c.srs = freshForward(oldForward, c.id, now);
          delete c.introducedAt;
        }
        c.srsReverse = oldForward;
      }
    }
    // The old list's name becomes a tag on words the learner typed, so lists
    // they organised themselves can still be found. Done before merging
    // duplicates, so a word kept from two lists keeps both names.
    const deckName = c.pack ? undefined : deckNames.get(c.deckId);
    if (deckName) {
      const tags = cleanTags([...(c.tags ?? []), deckName]);
      c.tags = tags.length ? tags : undefined;
    }
    return c;
  });

  // Past reviews of a turned word are relabelled to match: its old forward
  // (French → English) is now its reverse. Nothing else about them changes.
  const reviews = (list(raw.reviews).filter(isObject) as unknown as Review[]).map((r) =>
    flipped.has(r.cardId) ? { ...r, direction: flipDirection(r.direction) } : r,
  );

  // 2. Keep one card per word: the one with the most progress. The others'
  // reviews stay in the history, so stats and streaks don't change.
  const realReviews = new Map<string, number>();
  for (const r of reviews) {
    if (!r.intro) realReviews.set(r.cardId, (realReviews.get(r.cardId) ?? 0) + 1);
  }
  // A card without a creation time counts as the latest, so it never wins a tie.
  const progress = (c: V1Card) => [
    realReviews.get(c.id) ?? 0,
    c.srs?.stability ?? 0,
    -(typeof c.createdAt === "number" ? c.createdAt : Infinity),
  ];
  const better = (a: V1Card, b: V1Card) => {
    const pa = progress(a);
    const pb = progress(b);
    for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
    return false; // A full tie keeps the first one.
  };
  const groups = new Map<string, V1Card[]>();
  for (const c of cards) {
    const key = sameWordKey(c);
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const kept = new Map<V1Card, string[]>();
  for (const group of groups.values()) {
    const best = group.reduce((a, b) => (better(b, a) ? b : a));
    // The kept card's own tags come first, then the others'.
    const others = group.filter((c) => c !== best);
    kept.set(best, others.length ? cleanTags([best, ...others].flatMap((c) => c.tags ?? [])) : (best.tags ?? []));
    // Details only a dropped copy has are kept too. An example comes with its language.
    for (const o of others) {
      for (const k of ["notes", "image", "emoji"] as const) if (best[k] === undefined && o[k] !== undefined) best[k] = o[k];
      if (best.example === undefined && o.example !== undefined) {
        best.example = o.example;
        best.exampleLang = o.exampleLang;
      }
    }
  }

  // 3. Lists are gone and every word starts in Should learn.
  const out: Flashcard[] = [];
  for (const c of cards) {
    const tags = kept.get(c);
    if (!tags) continue;
    const { deckId: _deckId, ...rest } = c;
    void _deckId;
    const card: Flashcard = { ...rest, status: isStatus(c.status) ? c.status : "learn" };
    if (tags.length) card.tags = tags;
    out.push(card);
  }

  return {
    version: 2,
    cards: out,
    known: cleanKnown(raw.known),
    reviews,
    // Cleaned (and defaulted) by the store's revive, which also needs to see
    // whether rewards were missing.
    settings: raw.settings as Settings,
    rewards: raw.rewards as Rewards,
  };
}

function cleanKnown(v: unknown): Record<string, number> {
  const known: Record<string, number> = {};
  if (isObject(v)) for (const [k, at] of Object.entries(v)) if (typeof at === "number") known[k] = at;
  return known;
}

/**
 * How far before the high-water mark a version 1 save is still checked. A tab
 * stamps a word's createdAt (or a review's reviewedAt) before it saves: addCards
 * stamps one time and then awaits the scheduler for each word, and gradeCard
 * awaits it too. So a save that lands after the move (or a merge) read version 1
 * can carry a time from before it. Words in this window are told apart by id
 * (Data.lateV1Seen), so one already looked at is never added twice.
 */
const LATE_MARGIN = 60_000;

const createdAtOf = (c: unknown): number | undefined =>
  isObject(c) && typeof c.createdAt === "number" && Number.isFinite(c.createdAt) ? c.createdAt : undefined;

/**
 * The version 1 words already looked at that are still inside the window of the
 * high-water mark `through` (created after through - LATE_MARGIN), by id → createdAt:
 * those of `prev` and every word in `raw`. Older ones need no id: the mark excludes them.
 */
export function lateV1Seen(raw: V1Data, through: number, prev: Record<string, number> = {}): Record<string, number> {
  const seen: Record<string, number> = {};
  const add = (id: string, at: number) => {
    if (at > through - LATE_MARGIN) seen[id] = at;
  };
  for (const [id, at] of Object.entries(prev)) add(id, at);
  for (const c of list(raw.cards)) {
    const at = createdAtOf(c);
    if (at !== undefined) add(String((c as Record<string, unknown>).id), at);
  }
  return seen;
}

const sameKeys = (a: Record<string, number>, b: Record<string, number>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.hasOwn(b, k));
};

const time = (v: unknown): number => {
  const t = v === null || v === undefined ? NaN : new Date(v as string).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const reviewKey = (r: Review) => `${r.cardId}|${r.reviewedAt}|${r.direction ?? "forward"}`;

/**
 * A tab opened before the update keeps running the old code until it is
 * reloaded, and saves to version 1 only. This brings what it saved after the
 * move (`movedAt`) into version 2 data `d`: new reviews (relabelled like the
 * move does), a newer review state for a word in `d`, words added there, and
 * badges and goal days. Nothing in `d` is removed or made older. Returns null
 * when there is nothing to add; running it again on its own result adds nothing.
 *
 * A word is added only once: it must be newer than the high-water mark
 * `d.lateV1Through` (the move's time at first), less LATE_MARGIN, and not one
 * already looked at (`d.lateV1Seen`). The result raises the mark to the newest
 * word and review it saw, so a word deleted here later is not brought back.
 */
export function mergeLateV1<D extends Pick<Data, "cards" | "reviews" | "rewards" | "lateV1Through" | "lateV1Seen">>(
  d: D,
  raw: V1Data,
  movedAt: number,
  now = Date.now(),
): D | null {
  const late = migrateV1(raw, now);
  const since = movedAt - LATE_MARGIN;
  let changed = false;

  const seen = new Set(d.reviews.map(reviewKey));
  const reviews = late.reviews.filter(
    (r) => typeof r.reviewedAt === "number" && r.reviewedAt >= since && !seen.has(reviewKey(r)),
  );
  if (reviews.length) changed = true;

  const lateById = new Map(late.cards.map((c) => [c.id, c]));
  const cards = d.cards.map((c) => {
    const o = lateById.get(c.id);
    if (!o) return c;
    let next = c;
    if (time(o.srs.lastReviewAt) > time(c.srs.lastReviewAt)) next = { ...next, srs: o.srs };
    if (o.srsReverse && time(o.srsReverse.lastReviewAt) > time(c.srsReverse?.lastReviewAt)) {
      next = { ...next, srsReverse: o.srsReverse };
    }
    if (c.introducedAt === undefined && typeof o.introducedAt === "number" && o.introducedAt >= since) {
      next = { ...next, introducedAt: o.introducedAt };
    }
    if (next !== c) changed = true;
    return next;
  });
  // Words added in the old tab since the move or the last merge. One looked at
  // before (and maybe deleted here since) is not brought back, nor a second copy of a word here.
  const through = d.lateV1Through ?? movedAt;
  const seenBefore = d.lateV1Seen ?? {};
  const ids = new Set(d.cards.map((c) => c.id));
  const words = new Set(d.cards.map(sameWordKey));
  for (const c of late.cards) {
    const addedThere =
      typeof c.createdAt === "number" && c.createdAt > through - LATE_MARGIN && !Object.hasOwn(seenBefore, String(c.id));
    if (!addedThere || ids.has(c.id) || words.has(sameWordKey(c))) continue;
    cards.push(c);
    words.add(sameWordKey(c));
    changed = true;
  }

  const r: Record<string, unknown> = isObject(raw.rewards) ? raw.rewards : {};
  const badges = { ...d.rewards.badges };
  if (isObject(r.badges)) {
    for (const [id, at] of Object.entries(r.badges)) {
      if (typeof at === "number" && !(id in badges)) {
        badges[id] = at;
        changed = true;
      }
    }
  }
  const goalDays = [...d.rewards.goalDays];
  for (const day of list(r.goalDays)) {
    if (isString(day) && !goalDays.includes(day)) {
      goalDays.push(day);
      changed = true;
    }
  }
  let perfectQuizzes = d.rewards.perfectQuizzes;
  if (typeof r.perfectQuizzes === "number" && r.perfectQuizzes > perfectQuizzes) {
    perfectQuizzes = r.perfectQuizzes;
    changed = true;
  }

  // The new mark: the newest word looked at (added or not) and review taken.
  let lateV1Through = through;
  for (const c of list(raw.cards)) lateV1Through = Math.max(lateV1Through, createdAtOf(c) ?? -Infinity);
  for (const rv of reviews) lateV1Through = Math.max(lateV1Through, rv.reviewedAt);
  const lateSeen = lateV1Seen(raw, lateV1Through, seenBefore);
  if (lateV1Through !== d.lateV1Through || !sameKeys(lateSeen, seenBefore)) changed = true;

  if (!changed) return null;
  return {
    ...d,
    cards,
    reviews: [...d.reviews, ...reviews],
    rewards: { badges, goalDays, perfectQuizzes },
    lateV1Through,
    lateV1Seen: lateSeen,
  };
}
