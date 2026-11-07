# My Words and Sorting Implementation Plan (part 1: the app)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set the learner up once (language and name), give everyone a single "My words" list split into Should learn and Already know, let them pick ready-made lists and sort their words one at a time, show a level, and study only Should learn words, with every existing learner's lists merged in without losing progress.

**Architecture:** The saved data moves from `linguacards:v1` (many lists) to `linguacards:v2` (one list, plus a learner profile and a compact map of words sorted as known). A pure `migrateV1` turns old data and old backups into the new shape. Pure selectors in `src/lib/mywords.ts` decide which words are "mine" (English plus the learner's language), which can be studied, what is sorted, and the level. Pages read those selectors. List pages become My words, the ready-made lists page becomes the picking screen, and a new sorting page and setup page are added.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind 4, shadcn/ui on Base UI, ts-fsrs, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-my-words-and-sorting-design.md` (approved 2026-11-06). Part 2, the new words and advanced lists, is `docs/superpowers/plans/2026-11-06-bigger-lists.md`, and it starts after this plan.

## Global Constraints

- This is a newer Next.js than you know. Read the relevant guide in `node_modules/next/dist/docs/` before writing routing or navigation code (AGENTS.md).
- Static export with `trailingSlash: true`: there are no server redirects. Old URLs keep working through client pages that call `router.replace`. Search params are read with `useSearchParams` inside `<Suspense>`, as `src/app/deck/page.tsx` does today.
- Everything stays in the browser, in localStorage. The new key is `linguacards:v2`. The old `linguacards:v1` is never written again; it stays as the safety copy.
- The learner's language is `"fr" | "ar"`, and the words studied are English. Every word in My words has `src: "en"`. My words shows only words whose `tgt` is the learner's current language.
- **Sorting is not studying.** `sortWord`, `unsortWord`, `setStatus` and `learnKnownWord` never append to `reviews` and never call `setAndReward`. The same goes for the profile setters.
- Words sorted as Already know and never studied are stored as `known["<lang>:<pack>:<english>"] = timestamp`, not as flashcards.
- A ready-made word's identity is its list plus its English word. A word typed by the learner is identified by its English word plus its translation, both lowercased.
- The name is at most 30 characters, stays in the browser, is included in the backup, never goes into a URL, and is wrapped in `<bdi>` where it is shown.
- The level thresholds are, in one exported constant: Starter 0, A1 100, A2 400, B1 1,000, B2 2,000. Points: 2 per Already know word from an advanced list, 1 per any other Already know word.
- A Should learn word moves to Already know by itself when both directions are in `State.Review` and both are due at least 21 days ahead (`GRADUATE_DAYS = 21`).
- Badges count only words learned through study; words sorted as known never reach `metrics.learned`.
- Interface text goes through `defineMessages({en, fr, ar})`, with Arabic plurals using `zero/one/two/few/many/other`. Use "list" and "word", never "deck" or "card". Use logical Tailwind classes only. English words inside Arabic text are `<bdi lang="en" dir="ltr">`.
- Keyboard shortcuts on the sorting screen are `Digit1` (Already know) and `Digit2` (Should learn), read from `e.code` so they don't depend on keyboard layout or direction.
- The owner commits and pushes. No task commits; each task ends with its checks passing, then stops.
- Checks: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Review Focus

1. **A learner whose v1 data is mixed.** For example: the same ready-made list added in French and in Arabic, the same list added twice in French, a French→English list of their own, and a Spanish→German list. After the move they must keep every review, every card's progress, and their streak and badges. Opening the app a second time must not move anything again. → Task 1 (`migrateV1` tests) and Task 2 (load tests).
2. **Restoring an old backup file with several lists.** It must restore through the same move and keep the current profile when the backup has none. → Task 2 (`parseBackup` and `importData` tests).
3. **Tapping a sort button twice quickly, or reloading mid-sort.** There must be no duplicate cards, and on return the first unsorted word shows. → Task 4 (`sortWord` idempotence test) and Task 3 (`sortQueue` skips sorted words).
4. **Switching language with words in both.** The header count, Study, Quiz, My words and the level show only the current language's words. Switching back shows the other words, untouched. → Task 3 (`myCards`, `dueCount` and `levelOf` tests per language).
5. **A long or Latin-script name in the Arabic interface.** Over 30 characters it is cut at 30 characters. It keeps its own direction on the page and in scene bubbles. → Task 5 (`cleanName` test) and the browser check in Task 11.

---

### Task 1: Version 2 data and the move from version 1

**Files:**
- Modify: `src/lib/store.ts:13-126` (types only)
- Modify: `src/data/starter-packs.ts:8-17` (add `level` to `StarterPack`)
- Create: `src/lib/migrate.ts`
- Test: `src/lib/__tests__/migrate.test.ts`

**Interfaces:**
- Produces, in `store.ts`:
  ```ts
  export type LearnerLang = StarterLang;            // "fr" | "ar", from starter-packs.ts
  export type WordStatus = "learn" | "known";
  export interface Profile { lang: LearnerLang; name?: string; setupAt: number }
  // Flashcard: `deckId` removed; added:
  //   status: WordStatus;
  //   knownAt?: number;      // when it moved to Already know
  //   returnedAt?: number;   // when it was moved back to Should learn
  export interface Data {
    version: 2;
    profile?: Profile;
    cards: Flashcard[];
    known: Record<string, number>;   // "<lang>:<pack>:<english>" → when sorted as known
    reviews: Review[];
    settings: Settings;
    rewards: Rewards;
  }
  ```
  The `Deck` type and `Data.decks` are removed.
- Produces, in `starter-packs.ts`: `level?: "advanced"` on `StarterPack` (absent means a regular list), and `export function isAdvanced(packId: string | undefined): boolean`.
- Produces, in `migrate.ts`:
  ```ts
  export interface V1Data { decks?: unknown[]; cards?: unknown[]; reviews?: unknown[]; settings?: unknown; rewards?: unknown }
  export function sameWordKey(c: Pick<Flashcard, "pack" | "front" | "back" | "tgt">): string;
  // pack word: `${tgt}|${pack}|${front}`; own word: `${tgt}|own|${front.toLowerCase()}|${back.toLowerCase()}`
  export function migrateV1(raw: V1Data, now?: number): Omit<Data, "profile">;
  ```
  The returned object still needs `revive` (Task 2) for Dates. `migrateV1` itself is pure and synchronous.

- [ ] **Step 1: Write the failing tests** in `migrate.test.ts`, building v1 objects by hand with JSON-shaped srs objects (copy the shape from a `newSrsCard()` result):
  - `"keeps every card, review and setting"`: 2 decks and 3 cards. The output has `version: 2`, no `decks` key, the same `reviews` array (deep-equal), and the same `settings` and `rewards`.
  - `"marks every word Should learn"`: every output card has `status: "learn"` and no `deckId`.
  - `"tags own words with their old list name"`: the card `{front:"cat", back:"chat", src:"en", tgt:"fr"}` in deck `"Pets"` → `tags` includes `"Pets"`. A card with `pack:"food"` gets no deck tag.
  - `"turns French-first words English-first"`: `{src:"fr", tgt:"en", front:"chat", back:"cat", srs: S1 (state 2), srsReverse: S2}` plus two reviews on it (`direction:"forward"` and no direction) and one `direction:"reverse"`. The output card is `{src:"en", tgt:"fr", front:"cat", back:"chat", srs: S2, srsReverse: S1, exampleLang:"en"}`. Those reviews now read `"reverse"`, `"reverse"`, `"forward"`, with `rating`, `reviewedAt` and `day` unchanged. Reviews of other cards are untouched.
  - `"a French-first word not yet started just flips"`: srs state 0 and no `introducedAt` → `srs` stays the old `srs`, and there is no `srsReverse`.
  - `"a started French-first word with no reverse gets a fresh forward state"`: old `srs` in Review and no `srsReverse` → `srsReverse` is the old `srs`. `srs.state === 0`, `srs.reps === 0`, and its keys equal the keys of a `newSrsCard()` result.
  - `"keeps the word with more progress when one appears twice"`: two cards `{pack:"food", front:"bread", tgt:"fr"}`, one with 3 non-intro reviews and one with 1 → one card is left (the first one's id), its `tags` are the union, and all 4 reviews remain.
  - `"keeps the same ready-made word in two languages"`: `bread`/fr and `bread`/ar both survive.
  - `"keeps words in other languages, untouched apart from status"`: an es→de card stays with `src:"es", tgt:"de"`.
  - `"is idempotent on its own output"`: running `migrateV1` on the output again (with `decks` absent) gives a deep-equal result.
  - `"sameWordKey"`: `{pack:"food", front:"bread", tgt:"fr"}` → `"fr|food|bread"`, and `{front:"Cat", back:"Chat", tgt:"fr"}` → `"fr|own|cat|chat"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/migrate.test.ts` → FAIL (module missing).
- [ ] **Step 3: Change the types** in `store.ts` and `starter-packs.ts` as in Interfaces. Leave the code that no longer compiles for Task 2. Put `isAdvanced` next to `STARTER_PACKS`.
- [ ] **Step 4: Implement `migrateV1`.**
  - Flip a card when `tgt === "en" && src !== "en"`:
    - swap `front`/`back` and `src`/`tgt`;
    - set `exampleLang = old exampleLang ?? "en"`;
    - if the card was started (state ≠ 0 or `introducedAt` set): new `srsReverse` = old `srs`, and new `srs` = old `srsReverse` ?? a fresh New state;
    - relabel that card's reviews (`undefined`/`"forward"` ↔ `"reverse"`).
  - The fresh New state is built synchronously: `{...old srs, state: 0, stability: 0, difficulty: 0, reps: 0, lapses: 0, elapsedDays/scheduledDays fields set to 0, dueAt: now, lastReviewAt: null}`, using the field names `newSrsCard()` returns. The test pins the keys.
  - Dedupe:
    - group by `sameWordKey` (for every pair, since `tgt` is part of the key);
    - progress = the count of the card's non-intro reviews, then `srs.stability`, then the earlier `createdAt`;
    - the kept card gets the union of the group's tags through `cleanTags`.
  - Then:
    - add the deck name tag to cards without `pack`;
    - delete `deckId`;
    - set `status: "learn"` (keep an existing valid status, so it is idempotent);
    - set `known: raw.known ?? {}` and `version: 2`.
- [ ] **Step 5: Run** the test → PASS. Run `npx tsc --noEmit` and expect errors only in files Task 2 and later tasks will change: `store.ts` actions, pages and components.

### Task 2: The store on version 2: load, save, backups, profile

**Files:**
- Modify: `src/lib/store.ts:118-611` (key, `EMPTY`, `revive`, `load`, `set`, the actions, `parseBackup`, `importData`)
- Modify: `src/lib/__tests__/schedule.test.ts`, `src/lib/__tests__/rewards.test.ts`, `src/lib/__tests__/word-target.test.ts` (drop `deckId`/`decks`, `version: 2`, `status: "learn"`, `known: {}`)
- Test: `src/lib/__tests__/store-v2.test.ts`

**Interfaces:**
- Consumes: `migrateV1` and `sameWordKey` (Task 1).
- Produces (`store.ts`):
  ```ts
  export function setProfile(p: { lang: LearnerLang; name?: string }): void; // keeps setupAt if set, else Date.now(); name through cleanName from src/lib/profile.ts
  export function addCard(front: string, back: string, src: string, tgt: string, details?: CardDetails, extra?: { pack?: string; exampleLang?: string }): Promise<Flashcard>; // status "learn"
  export function addCards(src: string, tgt: string, items: { front: string; back: string; details?: CardDetails; pack?: string; exampleLang?: string }[]): Promise<Flashcard[]>;
  export function restoreCard(card: Flashcard): void; // puts it back if absent (no deck check)
  export function parseBackup(json: string): Data;   // accepts v1 (migrated) and v2
  export function importData(next: Data): boolean;   // keeps the current profile when next.profile is undefined
  export function __resetForTests(): Data; // clears the in-memory state, re-runs load() against the current localStorage, returns the snapshot; test-only
  ```
  `createDeck`, `renameDeck` and `deleteDeck` are removed.
- Produces (`src/lib/profile.ts`): `export function cleanName(s: unknown): string | undefined;` (trims, collapses whitespace, drops control characters, cuts to 30 code points, empty → undefined).

- [ ] **Step 1: Write the failing tests** in `store-v2.test.ts`. Install a `Map`-backed `localStorage` stub on `globalThis` (with `window` defined) before each test, then call `__resetForTests`:
  - `"moves v1 data to v2 once"`:
    - after putting v1 JSON with 2 decks in the stub, `__resetForTests()` returns `version: 2`;
    - `localStorage.getItem("linguacards:v2")` is set;
    - `linguacards:v1` is unchanged;
    - `linguacards:pair`, `linguacards:decks` and `linguacards:pack-decks` are removed;
    - `linguacards:starter-lang` is kept.
  - `"prefers v2 when both exist"`: when v1 and v2 are both present, v2 is used and v1 is ignored.
  - `"drops the safety copy if v2 does not fit"`: with a storage stub whose `setItem("linguacards:v2")` throws once while v1 exists → v1 is removed and the save is retried successfully.
  - `"restores a v1 backup through the move"`: `parseBackup(v1json)` returns `version: 2` with merged cards, and the backup's reviews stay deep-equal.
  - `"rejects a broken backup"`: `parseBackup("{}")` and a v2 backup with a card missing `srs` both throw `"Not a valid LinguaCards backup file."`.
  - `"keeps the profile when importing a backup without one"`: `setProfile({lang:"ar", name:"Lina"})`, then `importData(parseBackup(v1json))` → `profile.name === "Lina"`.
  - `"setProfile cleans the name and keeps setupAt"`: the name `"  Lina   B  "` becomes `"Lina B"`, and a 40-character name is cut to 30 characters. A second call keeps the first `setupAt`.
  - `"profile changes write no reviews"`: the `reviews` length is unchanged after `setProfile`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/store-v2.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
  - `KEY = "linguacards:v2"`, `OLD_KEY = "linguacards:v1"`. `EMPTY` gets `version: 2` and `known: {}`.
  - `revive` sets:
    - `status` (invalid → `"learn"`) and `knownAt`/`returnedAt` (numbers or undefined);
    - `known` (keep entries whose key matches `/^(fr|ar):[^:]+:.+$/` and whose value is a number);
    - `profile` (valid `lang` or undefined, `cleanName`, `setupAt` a number).
  - `load()`:
    - v2 → `revive`;
    - else v1 → `revive(migrateV1(JSON.parse(v1)))`, write v2, remove the three prefs;
    - keep the existing rewards backfill.
  - The `storage` listener reacts to `KEY` only, plus `linguacards:*` prefs as today.
  - `set()`: on a failed write while `OLD_KEY` exists, remove `OLD_KEY` and retry once.
  - `parseBackup`:
    - `version === 2` → validate cards as today minus `deckId`, plus `known` as an object; reviews as today;
    - otherwise → today's v1 checks, then `migrateV1`.
  - Update the three existing test files' fixtures.
- [ ] **Step 4: Run** `npx vitest run` → all pass apart from failures in tests of pages that don't exist yet (there are none). `npx tsc --noEmit` errors are now only in pages and components, which Tasks 5-10 fix.

### Task 3: My words selectors and the level

**Files:**
- Create: `src/lib/mywords.ts`
- Modify: `src/lib/store.ts:613-691` (`startedItems`, `dueReviews` and `newWords` lose `deckId`; `dueCount` moves to `mywords.ts`; `returnedWords` is added)
- Test: `src/lib/__tests__/mywords.test.ts`, and update `schedule.test.ts` for the new signatures

**Interfaces:**
- Consumes: `Data`, `Flashcard`, `LearnerLang` (type-only imports from `store.ts`), `STARTER_PACKS`, `isAdvanced`.
- Produces (`store.ts`):
  ```ts
  export function startedItems(cards: Flashcard[], keep: (i: StudyItem) => boolean): StudyItem[];
  export function dueReviews(cards: Flashcard[], now?: number): StudyItem[];
  export function newWords(cards: Flashcard[]): Flashcard[];      // New, not introduced, no returnedAt; oldest first
  export function returnedWords(cards: Flashcard[]): Flashcard[]; // New, not introduced, returnedAt set; oldest returnedAt first
  ```
- Produces (`mywords.ts`, which must not import runtime values from `store.ts`):
  ```ts
  export const OWN = "own";                                    // list filter value for words typed by the learner
  export function myCards(d: Pick<Data, "cards" | "profile">): Flashcard[];  // src "en" && tgt === profile.lang; [] without profile
  export function inList(c: Flashcard, list: string | null | undefined): boolean; // null → all; OWN → !c.pack; else c.pack === list
  export function studyCards(d: Pick<Data, "cards" | "profile">, list?: string | null): Flashcard[]; // myCards, status "learn", inList
  export function knownKey(lang: LearnerLang, pack: string, word: string): string;
  export function isSorted(d: Pick<Data, "cards" | "known" | "profile">, pack: string, word: string): boolean;
  export function sortQueue(d: Pick<Data, "cards" | "known" | "profile">, packIds: string[]): { pack: string; word: string }[];
  export function packProgress(d: Pick<Data, "cards" | "known" | "profile">, packId: string): { total: number; known: number; learn: number; left: number };
  export function sortedPacks(d: Pick<Data, "cards" | "known" | "profile">): Set<string>;
  export interface KnownEntry { pack?: string; word: string; translation: string; emoji?: string; card?: Flashcard; at: number }
  export function knownWords(d: Pick<Data, "cards" | "known" | "profile">): KnownEntry[]; // newest first
  export const LEVELS: readonly { id: LevelId; min: number }[]; // starter 0, a1 100, a2 400, b1 1000, b2 2000
  export type LevelId = "starter" | "a1" | "a2" | "b1" | "b2";
  export function levelOf(d: Pick<Data, "cards" | "known" | "profile">): { id: LevelId; points: number; next?: { id: LevelId; min: number } };
  export function dueCount(d: Pick<Data, "cards" | "reviews" | "settings" | "profile">, today: string, list?: string | null): number;
  ```
  Rules:
  - A ready-made word is sorted when one of these exists in the learner's language:
    - a card with that `pack` and `front`;
    - a `known` key for it;
    - an own card (no pack) whose lowercased `front` and `back` equal the row's English and translation.
  - `packProgress`:
    - `known` counts sorted-known words;
    - `learn` counts cards with that pack whose status is learn;
    - `left = total - known - learn`;
    - a word linked to an own card counts in the part the own card is in.
  - `levelOf` points:
    - +2 for each `known` key of an advanced pack, +1 for any other key;
    - plus the same for my cards with `status: "known"` (pack → `isAdvanced`, own → 1).
  - `dueCount = dueReviews(sc).length + returnedWords(sc).length + min(left, newWords(sc).length)`, where `sc = studyCards(d, list)`.

- [ ] **Step 1: Write the failing tests** in `mywords.test.ts`, with hand-built cards and `profile: {lang:"fr", setupAt: 0}`:
  - `"myCards is the current language only"`: fr, ar and es→de cards → only the fr card. With `lang:"ar"` → only the ar card. No profile → `[]`.
  - `"studyCards leaves out Already know words and filters by list"`.
  - `"sortQueue follows list order and skips sorted words"`:
    - use the real `food` list;
    - mark its 1st word known and its 2nd as a learn card;
    - add an own card equal to its 3rd word (`front`/`back` with different case);
    - the queue starts at the 4th word;
    - with `["food","travel"]`, the queue is food's unsorted words then travel's.
  - `"two lists can hold the same English word"`: sorting `right` in `describe` leaves `right` unsorted in `position`.
  - `"packProgress counts each part"`.
  - `"levelOf"`:
    - 99 regular known keys → `starter`, with `next.min === 100`;
    - 100 → `a1`;
    - 50 known keys from an advanced pack (use a stub pack id registered through a test-only `STARTER_PACKS.push` and removed in `afterEach`) → 100 points, `a1`;
    - known keys in `ar` don't count while the profile is `fr`.
  - `"dueCount counts only the current language and lets returned words through"`:
    - `newPerDay: 1`, two new fr words and one returned fr word → 2;
    - an ar new word adds nothing.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/mywords.test.ts` → FAIL.
- [ ] **Step 3: Implement** `mywords.ts` and the `store.ts` selector changes. Update `schedule.test.ts` calls: `addCards("en","fr",…)`, `dueReviews([seen])`, and import `dueCount` from `mywords` with a profile in the data.
- [ ] **Step 4: Run** `npx vitest run src/lib/__tests__/mywords.test.ts src/lib/__tests__/schedule.test.ts` → PASS.

### Task 4: Sorting and moving words between the two parts

**Files:**
- Modify: `src/lib/store.ts` (new actions; `gradeCard` at :456-496)
- Test: `src/lib/__tests__/sorting.test.ts`

**Interfaces:**
- Consumes: `knownKey`, `isSorted` (Task 3), `STARTER_PACKS`.
- Produces (`store.ts`):
  ```ts
  export const GRADUATE_DAYS = 21;
  export function isLearnedWell(c: Flashcard, now?: number): boolean;
  export function sortWord(pack: string, word: string, choice: "known" | "learn"): Promise<void>; // no-op if already sorted or no profile
  export function unsortWord(pack: string, word: string): void; // undo: removes the known key, or the card sortWord made if still not started
  export function setStatus(cardId: string, status: WordStatus): void;
  export function learnKnownWord(pack: string, word: string): Promise<void>; // known key → new card with returnedAt
  ```
  Behaviour:
  - `sortWord` with `"learn"` creates the same card that the words page's `addPack` makes today: `front` = English, `back` = `row[1]` (fr) or `row[2]` (ar), `pack`, `exampleLang: "en"`, details `{example: row[4], emoji: row[3] || undefined}`, and `status: "learn"`.
  - `setStatus(id, "known")` sets `status` and `knownAt: now`.
  - `setStatus(id, "learn")`:
    - sets `status`, `returnedAt: now`, and `dueAt = new Date(now)` on `srs` (if started) and on `srsReverse` (if present);
    - a not-started card keeps its New state.
  - `gradeCard`:
    - `wasNew` is only set when the card has no `returnedAt`;
    - after the update, if `status === "learn"` and `isLearnedWell(updated)`, it sets `status: "known"` and `knownAt`.

- [ ] **Step 1: Write the failing tests** in `sorting.test.ts`, with the store in memory and `setProfile({lang:"fr"})` first:
  - `"sorting writes no reviews"`: `sortWord("food", <first word>, "known")` and `sortWord("food", <second>, "learn")` → `reviews` is `[]`, and `rewards` is deep-equal to before.
  - `"Should learn makes the ready-made card"`: one card with the fields above, `status: "learn"`, `tgt: "fr"`.
  - `"Already know is a compact mark, not a card"`: `known["fr:food:<word>"]` is a number, and no card is made.
  - `"sorting twice is harmless"`: calling `sortWord` twice for the same word with `"learn"` (awaited in parallel with `Promise.all`) → exactly one card.
  - `"undo removes what sorting made"`: after `unsortWord`, the word is unsorted again. A learn card that has been introduced is not removed.
  - `"moving back to Should learn brings a studied word up today"`: take a card graded to Review (use `gradeCard` with `Rating.Good`), then `setStatus(id,"known")` and `setStatus(id,"learn")`. Then `dueTime(itemsOf(card)[0]) <= Date.now()`, `returnedAt` is set, and `reviews.length` is unchanged by the two moves.
  - `"a returned new word skips the daily limit and doesn't use it"`: `learnKnownWord` makes a New card with `returnedAt`. `returnedWords` includes it. Grading its intro writes a review without `wasNew`.
  - `"learned well moves to Already know by itself"`: build a card whose `srs` and `srsReverse` are in Review with `dueAt` 30 days ahead → `isLearnedWell` is true. With 10 days → false. Grading such a card `Rating.Good` (forward) leaves it `status: "known"` with `knownAt` set.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/sorting.test.ts` → FAIL.
- [ ] **Step 3: Implement** the actions. To serialise `sortWord`, chain calls on a module-level promise so parallel calls run one after another; then the `isSorted` check inside makes the second call a no-op.
- [ ] **Step 4: Run** `npx vitest run` → PASS.

### Task 5: First use: the setup page and the gate

**Files:**
- Modify: `src/lib/profile.ts` (add `guessLang` and `safeNext`)
- Create: `src/app/start/page.tsx`, `src/components/setup-gate.tsx`, `src/messages/start.ts`
- Modify: `src/components/providers.tsx:21-27` (wrap `children` in `<SetupGate>`)
- Modify: `src/components/word/scene-stage.tsx:371-410` (the learner's name for "You")
- Modify: `src/app/word/page.tsx:17,38-43` (fallback language from the profile)
- Test: `src/lib/__tests__/profile.test.ts`

**Interfaces:**
- Consumes: `setProfile`, `useStore`, `useHydrated` (Task 2), `myCards` (Task 3).
- Produces (`profile.ts`):
  ```ts
  export function guessLang(cards: Flashcard[], starterPref: string | null, locale: Locale): LearnerLang;
  // most common tgt among cards with src "en" and tgt fr|ar; else starterPref if fr|ar; else locale if fr|ar; else "fr"
  export function safeNext(next: string | null): string | null; // "/x…" only; null for "//…", "/start…", absent, or anything with "://" or "\\"
  export const GATED: readonly string[]; // ["/my-words","/words","/sort","/add","/study","/quiz","/story","/stats"]
  export function isGated(pathname: string): boolean; // matches "/study", "/study/", "/study/x"; not "/", "/start", "/word"
  ```
- `/start/` page:
  - Step 1 is "Your language": two large choices, Français and العربية, each in its own `lang`/`dir`, preselected by `guessLang`.
  - Step 2 is "Your name": an optional input with `maxLength={30}`, plus Continue and Skip.
  - On finish it calls `setProfile` and goes to `safeNext(next)`. Without a next, it goes to `/my-words/` if `myCards` is non-empty for the chosen language, else `/words/`.
  - It removes the `linguacards:starter-lang` pref after saving.
- `SetupGate` renders `children`. Once hydrated, when `!profile && isGated(pathname)`, it calls `router.replace("/start/?next=" + encodeURIComponent(pathname + search))` and renders nothing for that page in the meantime.
- Scene stage: when `mine` and the profile has a name, `who` is the name in `<bdi>` with `truncate`. The 86px column keeps working, and the name's full text is in `title`.

- [ ] **Step 1: Write the failing tests** in `profile.test.ts`:
  - `guessLang`:
    - 3 ar cards and 1 fr card → `"ar"`;
    - no cards with `starterPref "fr"` → `"fr"`;
    - no cards, no pref and locale `"ar"` → `"ar"`;
    - locale `"en"` → `"fr"`.
  - `safeNext`:
    - `"/study/?list=food"` is kept;
    - `"//evil.com"`, `"https://x"`, `"/start/"`, `"\\x"` and `null` → `null`.
  - `isGated`:
    - `"/study/"` → true, `"/words"` → true;
    - `"/"`, `"/start/"` and `"/word/"` → false.
  - `cleanName`:
    - `"\u0000Lina\n"` → `"Lina"`;
    - 31 Arabic letters → 30;
    - `"   "` → `undefined`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/profile.test.ts` → FAIL.
- [ ] **Step 3: Implement** the helpers, `messages/start.ts` (en/fr/ar: `title`, `langQuestion`, `langHint` "Translations will be in this language. You can change it later in Stats.", `nameQuestion`, `nameHint`, `namePlaceholder`, `continue`, `skip`), the page, the gate and the scene name.
- [ ] **Step 4: Run** `npx vitest run src/lib/__tests__/profile.test.ts` → PASS.

### Task 6: Picking lists

**Files:**
- Modify: `src/app/words/page.tsx` (rewrite)
- Modify: `src/messages/words.ts`

**Interfaces:**
- Consumes: `packProgress`, `sortedPacks` (Task 3), `isAdvanced`, the profile.
- Produces: navigation to `/sort/?lists=<id>,<id>` in the order the lists appear on the page.

Behaviour:
- Each list keeps today's card layout (emoji, live title in the interface language, a preview of the first 8 words as word-page links, the word count) and gains a checkbox with the whole card clickable.
- It shows `"{left} left to sort"` when partly sorted. When `left === 0` it shows `"All sorted: {known} known, {learn} to learn"` and is disabled.
- Regular lists come first. Advanced lists are in a second group headed `advancedTitle`, which is hidden while there are no advanced lists.
- A sticky bottom bar shows **Continue with {count} words**, disabled with nothing ticked. `count` is the sum of `left`.
- The language tabs, `deckFor`, `addPack`, the toast and both prefs are removed.
- The footer keeps the "why" text, plus Study and Stories links once anything is sorted.
- Message keys removed: `translations`, `added`, `openList`, `addPack`, `addedToast`, `addedHint`, `startHere`. Added: `pickHint`, `leftToSort`, `allSorted`, `continueWith` (Arabic plural), `advancedTitle`.

- [ ] **Step 1: Implement** the page and the messages.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/i18n.test.ts` and `npx tsc --noEmit` → no errors in `words/page.tsx` or `messages/words.ts`.

### Task 7: The sorting screen

**Files:**
- Create: `src/app/sort/page.tsx`, `src/messages/sort.ts`

**Interfaces:**
- Consumes: `sortQueue`, `levelOf` (Task 3), `sortWord`, `unsortWord` (Task 4), `SpeakButton`, `wordHref`.

Behaviour:
- It reads `lists` (comma-separated, unknown ids dropped) inside `<Suspense>`.
- The queue is computed once after hydration, in `useState` or a ref, so the order doesn't shift as words are sorted.
- **The card:**
  - emoji;
  - the English word (`bdi lang="en" dir="ltr"`, large, `font-display`);
  - the translation (`lang`/`dir` of the learner's language);
  - the example;
  - a speaker button for the word.
- **Buttons:**
  - **Already know** (outline) and **Should learn** (primary), each `h-14`, side by side, in that logical order;
  - hints "1" and "2" shown on them;
  - `Digit1`/`Digit2` keys trigger them, ignored while focus is in an input or a modifier key is held.
- **Progress:** `"{n} of {total}"` and a `Progress` bar.
- **Undo:** reverts the last decision with `unsortWord`, keeps a stack of decisions, and is disabled when the stack is empty.
- If a word turns out to be already sorted (another tab), it is skipped.
- **The end:**
  - counts known and to-learn for this session, and the level with `levelOf` (label from `sort.levelName`, a `Record<LevelId, string>`-like set of keys `levelStarter`, `levelA1`…);
  - buttons **Study** (`/study/`) and **Pick more lists** (`/words/`).
- With no `lists` or nothing left, it shows `nothingLeft` with a link to `/words/`.
- Messages: `progress`, `alreadyKnow`, `shouldLearn`, `undo`, `doneTitle`, `doneKnown` (plural), `doneLearn` (plural), `yourLevel`, `study`, `pickMore`, `nothingLeft`, `levelStarter`, `levelA1`, `levelA2`, `levelB1`, `levelB2`.

- [ ] **Step 1: Implement** the page and the messages.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/i18n.test.ts` and `npx tsc --noEmit` → no errors in these files.

### Task 8: My words page, header, and old list pages

**Files:**
- Create: `src/app/my-words/page.tsx`, `src/components/word-row.tsx` (moved from `CardRow` in `src/app/deck/page.tsx:313-377`), `src/components/backup-card.tsx` (moved from `src/app/decks/page.tsx:51-72,166-190`), `src/messages/mywords.ts`
- Modify: `src/app/decks/page.tsx`, `src/app/deck/page.tsx` (replace with redirect stubs to `/my-words/`)
- Modify: `src/components/site-header.tsx:20-25,36` (`LINKS[0]` = `{href:"/my-words", label:"navDecks", also:["/words","/sort","/add","/word","/decks","/deck"]}`; `dueCount` from `mywords`)
- Modify: `src/components/card-editor.tsx:24,71,89-90,121` (prop `pair: {src: string; tgt: string}` replaces `deck`; create calls `addCard(front, back, pair.src, pair.tgt, details)`)
- Delete: `src/components/new-deck-dialog.tsx`, `src/components/pair-select.tsx`, `src/messages/deck.ts`, and from `src/messages/decks.ts` everything except the backup keys (renamed file: `src/messages/backup.ts`)

**Interfaces:**
- Consumes: `myCards`, `knownWords`, `levelOf`, `inList`, `OWN` (Task 3); `setStatus`, `learnKnownWord` (Task 4); the profile.
- Produces:
  ```ts
  // word-row.tsx
  export function WordRow(props: { card: Flashcard; onEdit: (c: Flashcard) => void; action?: ReactNode }): JSX.Element;
  // backup-card.tsx
  export function BackupCard(): JSX.Element;
  ```

Behaviour of `/my-words/`:
- **Greeting:**
  - `hello` ("Hi {name}") or `helloNoName`, then `dueToday` ("{count} words to study today", plural);
  - the level, with points and what the next level needs (`nextLevel`: "{points} more points to {level}").
- **Tabs:** **Should learn ({count})** and **Already know ({count})**. Tab state is in the URL as `?tab=known`.
- **Filters:**
  - a list filter `Select`: All lists, then each list with sorted words (live title), then "My own" (`OWN`);
  - search, as in today's deck page;
  - tag chips.
- **Should learn rows:** `WordRow` with action **I know this** → `setStatus(id,"known")`.
- **Already know rows:**
  - cards with `status: "known"` → `WordRow`, action **Learn again** → `setStatus(id,"learn")`;
  - `known` entries without a card → a simple row (emoji, English as a word-page link, translation), action **Learn again** → `learnKnownWord`.
- **Buttons:** **Pick lists** (`/words/`), **Add your own words** (`/add/`), **Study** (`/study/?list=…` when filtered), **Quiz**.
- **Empty state:** "Pick your first lists" → `/words/`.
- **Bottom:** `<BackupCard />`.
- The stubs `/decks/` and `/deck/` call `router.replace("/my-words/")` in an effect and render a plain link meanwhile.

- [ ] **Step 1: Implement** the components, the page, the stubs, the header and the editor changes. Delete the files listed.
- [ ] **Step 2: Run** `npx vitest run` and `npx tsc --noEmit` → no errors outside `add`, `study`, `quiz`, `story` and `stats` pages.

### Task 9: Add words with the learner's language

**Files:**
- Modify: `src/app/add/page.tsx` (lines :9-128 for prefs, decks and pair; :173-208 `add()`; :270-275, :358-394, :406, :452-468 for the UI)
- Modify: `src/messages/translate.ts`

Behaviour:
- `pair` is always `{src: "en", tgt: profile.lang}`. A two-option toggle (`typingIn`: English or the learner's language, labelled with the language names) sets the translation direction. It is kept in component state and starts on English.
- `add()`:
  - always stores the card English-first, swapping when typing in the learner's language;
  - uses `addCard(en, other, "en", lang, details)` with `status: "learn"`;
  - does no deck creation.
- "Recently added" is the last 5 of `myCards` without `pack`. Its link reads **Study my words** → `/study/?list=own`.
- `CardEditor` gets `pair`.
- Removed: `PairSelect`, swap, `changePair`, `chooseDeck`, `NewDeckDialog`, the "Add to" select, `willCreate`, the `?deck=` handling, and the prefs `linguacards:pair` and `linguacards:decks`.
- The engine choice and model loading stay as they are.
- Message keys removed: `swap`, `addTo`, `newDeckOption`, `willCreate`, `defaultDeckName`, `studyDeck`. `added` becomes "Added to My words". Added: `typingIn`, `studyMine`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** `npx tsc --noEmit` → no errors in `add/page.tsx`. Run `npx vitest run src/lib/__tests__/i18n.test.ts` → PASS.

### Task 10: Study, Quiz, Stories and Stats on My words

**Files:**
- Modify: `src/app/study/page.tsx:76-148,266-325`, `src/app/quiz/page.tsx:48-130`, `src/app/story/page.tsx:34-82,172`, `src/lib/story.ts:152-153`, `src/app/stats/page.tsx:34-124`
- Create: `src/components/you-card.tsx`
- Modify: `src/messages/study.ts`, `src/messages/quiz.ts`, `src/messages/story.ts`, `src/messages/stats.ts`
- Test: update `src/lib/__tests__/story.test.ts` for `todaysCards(cards, reviews, today)`

Behaviour:
- **Study:**
  - The params are `list` and `tag`, and `deck` is ignored.
  - `inScope = studyCards(d, list).filter(hasTag)`.
  - `fresh = [...returnedWords(inScope), ...newWords(inScope).slice(0, left)]`, mapped to forward items.
  - Due items come from `startedItems(inScope, …)`.
  - The title is "My words", or the list's live title (`OWN` → "My own words").
  - End screen:
    - `quizDeck` becomes `quizMine` → `/quiz/?list=…`;
    - `starterWords` → `/words/` with the label "Pick more lists";
    - `nothingText` points to picking lists and sorting.
- **Quiz:**
  - The `list` param is used, and the deck requirement is removed.
  - Words are `studyCards(d, list)` that have started (`srs.state !== New || introducedAt`).
  - Direction tabs use `{src:"en", tgt: lang}`.
  - Keys `pickDeck`, `goToDecks` and `wholeDeck` are replaced by `noStarted` ("Study a few words first, then quiz yourself.") and `wholeList`.
- **Stories:**
  - `packs = sortedPacks(d)`.
  - The translation language is `profile.lang`.
  - `todaysCards` drops `deckId`, and links drop `&deck=`.
- **Stats:**
  - The "By list" card becomes **My words**:
    - Should learn and Already know counts;
    - the level;
    - per sorted list, a `packProgress` line.
  - New `YouCard`:
    - a name input saved with `setProfile` on Save;
    - a language choice (Français/العربية) with the hint "Each language keeps its own words.";
    - Save writes the profile.

- [ ] **Step 1: Implement**, and update `story.test.ts`.
- [ ] **Step 2: Run** `npx vitest run`, `npx tsc --noEmit`, `npm run lint` and `npm run build` → all clean, with no reference left to `deckId`, `decks` or `PairSelect` (`grep -rnE "deckId|\.decks\b|PairSelect|NewDeckDialog" src` prints nothing).

### Task 11: Check it in the browser, and the README

**Files:**
- Modify: `README.md` (feature list: one My words list, setup, pick and sort, level; remove the lists wording; layout: `src/lib/mywords.ts`, `src/lib/migrate.ts`, `src/lib/profile.ts`, `src/app/start`, `src/app/sort`, `src/app/my-words`)
- Modify: `docs/superpowers/specs/2026-11-06-my-words-and-sorting-design.md` (status line: "part 1 built, <date>")

- [ ] **Step 1: Fresh learner** (empty storage), at phone width and desktop:
  1. `/study/` redirects to `/start/`;
  2. pick Arabic, name "Lina";
  3. tick two lists → Continue;
  4. sort 10 words with the buttons and the 1/2 keys, then Undo once;
  5. reload mid-sort and expect it to resume at the next unsorted word;
  6. finish;
  7. My words shows both tabs with the right counts and level;
  8. Study shows only Should learn words;
  9. a scene on a word page shows "Lina" for "You".
- [ ] **Step 2: Existing learner.**
  1. Seed `linguacards:v1` with a real export taken from the live app before the change (several lists, reviews), plus `linguacards:starter-lang=ar`.
  2. Load, and expect setup with Arabic preselected.
  3. Expect: all words in Should learn, the review heatmap and streak unchanged on Stats, badges unchanged, and `linguacards:v1` still present.
  4. Switch language to French in Stats: My words shows the French words only. Switch back.
- [ ] **Step 3: Arabic interface.** Check right to left on `/start/`, `/words/`, `/sort/`, `/my-words/` and Stats. Check a Latin name inside Arabic text, and a 30-character name in a scene bubble.
- [ ] **Step 4: Old links.** `/decks/`, `/deck/?id=x`, `/study/?deck=x` and `/quiz/?deck=x` all land somewhere sensible, with no error.
- [ ] **Step 5: Run** all checks: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Update the README and the spec status.
