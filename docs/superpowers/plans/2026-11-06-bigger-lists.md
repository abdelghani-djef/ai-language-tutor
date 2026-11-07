# Bigger Lists Implementation Plan (part 2: the words)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow each of the 20 ready-made lists to 100 words and add 15 advanced lists of 100 words each. Every new word comes with its translations, example, four scenes and vetted pictures, delivered one list at a time.

**Architecture:** This is content only. Rows go in `src/data/starter-packs.ts`, and scenes and pictures in `public/scenes/<pack>.json`, plus new places in `public/scenes/_places.json`. Task 1 hardens the content tests and sets size budgets. Task 2 is one repeatable batch, run once per list, as a workflow of writer and checker agents. A list's new words go into `starter-packs.ts` in the same batch as their scenes, so the existing gate ("every ready-made list has a complete scenes file") stays strict.

**Tech Stack:** TypeScript data files, static JSON, Vitest, Wikimedia Commons API, workflow agents.

**Spec:** `docs/superpowers/specs/2026-11-06-my-words-and-sorting-design.md`, section "Content: 100 words per list and advanced lists". It starts after `docs/superpowers/plans/2026-11-06-my-words-and-sorting.md` (part 1), which adds `level?: "advanced"` and `isAdvanced`.

## Global Constraints

- **The current rows never change.** The first rows of every existing list (today's ~25) keep their exact text, order and translations, so existing cards, known marks (`"<lang>:<pack>:<english>"`) and scenes still match.
- **Regular lists:**
  - grow to exactly 100 rows;
  - the new rows are the next most useful everyday words on the topic for a beginner, most useful first.
- **Advanced lists:**
  - exactly 100 rows of harder, less common words on the topic;
  - `level: "advanced"`;
  - appended after all regular lists in `STARTER_PACKS`, so `packOf` prefers the regular sense.
- **Ids, titles and emoji of the 15 advanced lists:** each takes the emoji of its regular list. Titles follow the pattern "Advanced: <regular title>" / "Avancé : <titre>" / "متقدم: <العنوان>".

  | Id | Regular title (en) |
  |---|---|
  | `adv-people` | People and family |
  | `adv-time` | Time and days |
  | `adv-food` | Food and drink |
  | `adv-home` | Home and everyday things |
  | `adv-body` | Body and health |
  | `adv-describe` | Describing words |
  | `adv-verbs` | Core verbs + Daily actions; title "Advanced: Verbs" |
  | `adv-places` | Places in town |
  | `adv-school` | School and learning |
  | `adv-work` | Work and jobs |
  | `adv-travel` | Travel and transport |
  | `adv-feelings` | Feelings |
  | `adv-nature` | Nature and weather |
  | `adv-animals` | Animals |
  | `adv-clothes` | Clothes |

- **Row format** stays `[English, French, Arabic, emoji or "", English example]`:
  - the example contains the word (through `highlightWords`);
  - Arabic is Modern Standard Arabic;
  - French has its article for nouns ("le pain");
  - the language suits children.
- **Duplicates:**
  - no English word twice in one list;
  - an advanced list never repeats a word from any regular list;
  - a word in two regular lists only when it means different things there, and listed in `ALLOWED_SHARED` in the test.
- **Per word in `public/scenes/<pack>.json`:**
  - 4 scenes at 4 different places from `_places.json`, with 2–4 lines each;
  - `who` and `text` in en/fr/ar;
  - the learner's own lines use `who.en` exactly `"You"` (`"Toi"`, `"أنت"`), so the learner's name replaces it;
  - at least one English line uses the word in the list's sense;
  - vocabulary from this list and earlier lists where possible.
- **Pictures**, the policy unchanged from the word page spec:
  - 0–3 per word, from Wikimedia Commons;
  - CC0, PD, CC BY or CC BY-SA, with author, licence and caption;
  - looked at before being kept;
  - none for function words, greetings, numbers above ten or abstract words, because a wrong picture is worse than none;
  - thumb URLs saved **without** the `?utm_…` query.
- **New places** for advanced topics (pharmacy, court, office meeting…) are added to `_places.json` with an emoji, a three-language label and a vetted picture. Existing place keys never change.
- **Size budgets**, enforced by tests:
  - each `public/scenes/<pack>.json` is at most 100 KB gzipped (about 50–70 KB is expected at 100 words);
  - `src/data/starter-packs.ts` is at most 150 KB gzipped.
- **No new stories** (spec non-goal).
- The owner commits and pushes. No task commits. Each batch ends with its checks passing and a short report: words added, pictures kept, places added, sizes.
- Checks: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Review Focus

1. **A word whose sense in the scenes differs from its translation.** For example "bank" as a riverbank when the row says "la banque". The checker must catch it, and the test can't. → Task 2, checker step, with an explicit instruction and a per-list report of words it changed.
2. **An existing row edited by accident**, such as a typo fix or a translation tweak. That would orphan learners' cards and known marks. → Task 1, `"keeps today's rows unchanged"` test.
3. **Mojibake or the wrong script in Arabic or French** (Latin letters in an Arabic field, missing accents). → Task 1, `"translations are in the right script"` test.
4. **A list half-shipped**, with rows added but scenes missing. → Already caught by the gate test. Task 2 adds rows and scenes in the same batch.
5. **Picture links that carry tracking queries or point outside Wikimedia.** → Task 1, `"pictures are clean Wikimedia links"` test.

---

### Task 1: Content checks, budgets and cleanup

**Files:**
- Create: `src/lib/__tests__/starter-packs.test.ts`
- Create: `src/lib/__tests__/fixtures/pack-heads.json` (generated once, now: `{ [packId]: row[] }` with every current row of the 20 lists)
- Modify: `src/lib/__tests__/word-scenes.test.ts` (licence set, URL check, gzip budget)
- Modify: every `public/scenes/*.json` (strip `?utm_…` from `thumb` and `page`)

**Interfaces:**
- Consumes: `STARTER_PACKS`, `isAdvanced` (part 1), `highlightWords` from `src/lib/story.ts`, and `gzipSync` from `node:zlib`.
- Produces: `export const ALLOWED_SHARED: ReadonlyMap<string, readonly string[]>` in the test file. It starts as `right → [describe, position]`, `answer → [school, verbs-daily]` and `cook → [verbs-daily, work]`.

- [ ] **Step 1: Write the tests** in `starter-packs.test.ts`:
  - `"keeps today's rows unchanged"`: for each id in `pack-heads.json`, the list's first N rows deep-equal the fixture.
  - `"every example uses its word"`: each `row[4]`, run through `highlightWords(row[4], row[0])`, marks at least one span.
  - `"no word twice in a list"`.
  - `"advanced lists never repeat a regular word"`.
  - `"shared words are only the allowed ones"`: every English word in two or more regular lists is a key of `ALLOWED_SHARED` with exactly those list ids.
  - `"translations are in the right script"`: `row[2]` matches `/\p{Script=Arabic}/u` and has no `[A-Za-z]`. `row[1]` has no Arabic script. Neither contains `�`.
  - `"lists have the right size"`: every list is either still at its fixture length or exactly 100. Advanced lists are exactly 100.
  - `"starter-packs.ts stays light"`: the gzipped size of the file is at most 150 × 1024 bytes.
- [ ] **Step 2: Add** to `word-scenes.test.ts`:
  - `"pictures are clean Wikimedia links"`: every `thumb` matches `^https://(upload|thumb)\.wikimedia\.org/` or `^https://upload\.wikimedia\.org/`, every `page` matches `^https://commons\.wikimedia\.org/`, and neither contains `utm_`.
  - `"licences are free"`: each licence, uppercased, starts with one of `CC0`, `PD`, `PUBLIC DOMAIN`, `CC BY`.
  - `"scene files stay light"`: each file gzipped is at most 100 × 1024 bytes.
- [ ] **Step 3: Generate** `pack-heads.json` with a one-off `node` command that imports the current rows (use `npx tsx -e` or a small `.mts` in the scratchpad). Run the tests: only the utm checks fail.
- [ ] **Step 4: Strip** `?utm_…` from every `thumb`/`page` in `public/scenes/*.json` with a small script in the scratchpad (parse JSON, rewrite, stringify with the files' current formatting). Run `node scripts/contact-sheet.mjs`.
- [ ] **Step 5: Run** `npx vitest run` → PASS. Run `npm run build` and record the `/study/` first-load JS size from its output in the task report. This is the "before" figure for Task 3.

### Task 2: One list batch (repeat for each list)

Run this once per list, in this order: the 20 regular lists in `STARTER_PACKS` order (greetings → position), then `adv-people`, `adv-time`, `adv-food`, `adv-home`, `adv-body`, `adv-describe`, `adv-verbs`, `adv-places`, `adv-school`, `adv-work`, `adv-travel`, `adv-feelings`, `adv-nature`, `adv-animals`, `adv-clothes`. Two batches can run at once only if they are different lists and the second doesn't need the first's new places.

**Files (per batch):**
- Modify: `src/data/starter-packs.ts` (the list's rows; for an advanced list, a new entry with `level: "advanced"`)
- Modify: `public/scenes/<pack>.json` (or create it for an advanced list, with `complete: true`)
- Modify: `public/scenes/_places.json` (only when a new place is needed)
- Modify: `src/lib/__tests__/starter-packs.test.ts` (`ALLOWED_SHARED` only, when a shared word is truly a different sense)
- Regenerate: `docs/pictures.html`

**Interfaces:**
- Consumes: the checks from Task 1, `validatePackScenes`, and the existing scene format (`PackScenes` in `src/lib/word/scenes.ts`).

Run each batch as a workflow:

1. **Words** (1 agent):
   - writes the new rows: 75 for a regular list, or 100 for an advanced one;
   - follows the row rules in Global Constraints;
   - gets the full list of every existing English row, so it can avoid duplicates;
   - orders by usefulness;
   - picks an emoji only when it plainly shows the word.
2. **Words check** (1 agent, a fresh one) reads the rows as a native editor of English, French and Arabic, and fixes:
   - wrong or unnatural translations;
   - missing French articles;
   - non-MSA Arabic;
   - examples that don't use the word in the list's sense;
   - anything unsuitable for children;
   - words that are too rare for a regular list, or too easy for an advanced one.

   It reports what it changed.
3. **Scenes** (4 agents, 25 words each): write 4 scenes per word using only keys of `_places.json`. Where a topic truly needs a new place, they propose it (key, emoji, three labels) instead of inventing a key.
4. **Places**: if new places were proposed, 1 agent adds them to `_places.json` after checking that no existing key fits, and finds each a picture under the picture policy.
5. **Scenes check** (4 agents, fresh ones), reading as native editors, fix:
   - unnatural lines and wrong translations;
   - a sense that differs from the row's translation;
   - `who` labels;
   - the learner's lines not using "You".

   Each runs `npx vitest run src/lib/__tests__/word-scenes.test.ts` until it passes.
6. **Pictures** (2 agents, 50 words each):
   - search Commons the way the word page plan's Task 8 does;
   - **look at** each candidate;
   - keep 0–3 per word under the picture policy;
   - save URLs without utm.
7. Run `node scripts/contact-sheet.mjs`, then all checks.

- [ ] **Step 1: Run the batch workflow** for the next list.
- [ ] **Step 2: Run** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` → all clean.
- [ ] **Step 3: Check in the browser:**
  - pick the list on `/words/` and see its count (100);
  - sort a few of its new words;
  - open two new words' pages in the Arabic interface;
  - for an advanced list, see it under the Advanced group, and see the level move by 2 points per known word.
- [ ] **Step 4: Report:**
  - words added;
  - words the checkers changed;
  - pictures kept and words without pictures;
  - places added;
  - the list's gzipped scene size and `starter-packs.ts` gzipped size.

  Stop, so the owner can commit before the next list.

### Task 3: Wrap up

**Files:**
- Modify: `README.md` (word counts: 35 lists, about 3,500 words; advanced lists)
- Modify: `docs/superpowers/specs/2026-11-06-my-words-and-sorting-design.md` (status: "content built, <date>")
- Keep `src/lib/__tests__/fixtures/pack-heads.json`: it still guards the old rows.

- [ ] **Step 1:** Once all 35 lists are done, run all checks, and run the first-load JS size of `/study/` from the `npm run build` output. Compare it with the size before part 2, which is recorded in Task 1's report, and include both in the final report.
- [ ] **Step 2:** Update the README and the spec status.
