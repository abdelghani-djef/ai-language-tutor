# LinguaCards

Language-learning flashcards that run entirely in your browser:

1. **Translate**: type a word or sentence and translate it on-device with Transformers.js.
2. **Save**: keep the translation (edited if you like) as a flashcard in a deck.
3. **Study**: flip the card and rate it **Again / Hard / Good / Easy**. The FSRS spaced-repetition algorithm decides when you see it next.
4. **Track**: see cards learned, your study streak, recall rate, and a heatmap of your study activity.

There is **no backend, no database and no account**. Decks, cards and review history are stored in your browser's `localStorage`. Translation models are downloaded from the Hugging Face Hub the first time you use a language pair, and the browser caches them after that.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) App Router, exported as a static site (`output: "export"`) |
| UI | [shadcn/ui](https://ui.shadcn.com) (Base UI primitives) + Tailwind CSS v4, light and dark themes |
| Translation | [Transformers.js](https://huggingface.co/docs/transformers.js) (`@huggingface/transformers`) running in a Web Worker |
| Spaced repetition | [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (FSRS-7) |
| Pronunciation | The browser's built-in `speechSynthesis` (free, offline on most systems) |
| Storage | `localStorage`, with JSON export and import for backups |
| Tests | Vitest |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm test           # unit tests (FSRS wrapper, streaks/heatmap, quiz answer checking)
npm run lint
npm run build      # static site in out/, which you can host anywhere (GitHub Pages, Netlify, S3…)
```

To serve the production build locally: `npx serve out`.

## Features

- **Translate** (`/`): pick a language pair (EN↔FR, EN↔ES, EN↔DE, EN↔IT, EN↔AR), use **swap** to reverse it, then press **Translate** or Ctrl+Enter. You can edit the translation before you save it. Speaker buttons read either side aloud.
- **Decks** (`/decks`): create, rename and delete decks. Each deck shows its total, due and learned counts. **Export/Import** downloads or restores a JSON backup, which matters because your data lives only in this browser.
- **Deck** (`/deck?id=…`): add cards by hand, edit or delete cards, and see each card's FSRS state and next due time.
- **Study** (`/study`, or `/study?deck=…` for one deck): reviews every card due today, most overdue first. Each rating button shows the interval it would give (for example `10m`, `3d`). Keyboard shortcuts: Space flips, 1–4 rates, P pronounces. Cards you get wrong come back later in the same session (learning steps), and the page waits for them.
- **Quiz** (`/quiz?deck=…`): ten random cards in either direction, answered by **typing** or by **multiple choice** (needs at least 4 cards). Typed answers ignore case, accents, punctuation and Arabic diacritics, and a small typo counts as "close enough". The quiz is practice only and does not change the FSRS schedule.
- **Stats** (`/stats`): cards learned, current and longest streak, cards due, reviews today, 30-day recall rate, a 26-week activity heatmap, and per-deck progress.

## Translation models

Each direction uses one small MarianMT model from the [opus-mt](https://huggingface.co/Helsinki-NLP) family, converted to ONNX by Xenova:

| Pair | Models |
| --- | --- |
| English ↔ French | `Xenova/opus-mt-en-fr`, `Xenova/opus-mt-fr-en` |
| English ↔ Spanish | `Xenova/opus-mt-en-es`, `Xenova/opus-mt-es-en` |
| English ↔ German | `Xenova/opus-mt-en-de`, `Xenova/opus-mt-de-en` |
| English ↔ Italian | `Xenova/opus-mt-en-it`, `Xenova/opus-mt-it-en` |
| English ↔ Arabic | `Xenova/opus-mt-en-ar`, `Xenova/opus-mt-ar-en` |

The app loads them with 8-bit quantization (`dtype: "q8"`), which is about 75 MB per direction. They run in a Web Worker (`src/lib/translator.worker.ts`) so the page stays responsive while a model downloads or generates text.

To add a pair, add the language to `LANGUAGES` and the code to the list in `src/lib/languages.ts`. That only works if a matching `Xenova/opus-mt-xx-yy` model exists.

**Alternative:** `Xenova/nllb-200-distilled-600M` covers about 200 languages with one model, but the download is about 600 MB or more. To use it, swap the model ID and pass `src_lang` / `tgt_lang` (FLORES-200 codes such as `eng_Latn`, `fra_Latn`) in the worker's translator call.

## How the spaced repetition works (FSRS)

LinguaCards does not implement its own scheduler. It uses [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs), the TypeScript implementation of the **Free Spaced Repetition Scheduler**, the same family of algorithms Anki has shipped since version 23.10.

### The idea

Older schedulers such as SM-2 (classic Anki or SuperMemo 2) multiply the interval by a fixed "ease" factor. FSRS instead models **your memory** of each card and asks one question: *when will the chance that you still remember this card drop to the target retention?* The default target is 90%.

FSRS tracks three numbers for every card:

| Variable | Meaning |
| --- | --- |
| **Difficulty (D)** | How hard the card is for you, from 1 to 10. Rating *Again* or *Hard* raises it and *Easy* lowers it. It drifts slowly back toward a default, so one bad day doesn't ruin a card. |
| **Stability (S)** | The number of days after which your recall probability falls to 90%. A card with S = 30 days is still 90% likely to be remembered a month after its last review. |
| **Retrievability (R)** | The probability that you can recall the card *right now*. It is 1 just after a review and decays over time along a forgetting curve. |

### The forgetting curve

Retrievability decays with the time since the last review (*t*) according to a power-law forgetting curve. FSRS uses a power law rather than an exponential because it fits real review data better. When *t = S*, *R* is exactly 90%. FSRS-7 (the version used here) keeps a fast and a slow stability component (`stabilityFast` and `stability` on each card), which models short-term and long-term memory better within a single day.

### What happens when you rate a card

1. FSRS computes the current **R** from the card's stability and the time since its last review.
2. It updates **D** based on your rating.
3. It updates **S**:
   - **Again** (you forgot): stability drops sharply, the card goes to *Relearning*, and it comes back after a short relearning step (10 minutes here).
   - **Hard / Good / Easy** (you remembered): stability grows. It grows **more** when the card is easy (low D), when stability is already low, and, counter-intuitively, when **R was low**. Recalling something you were about to forget strengthens the memory the most, which is the *spacing effect*.
4. The next interval is the time it takes **R** to decay from 1 to the desired retention (0.9). With some fuzz added, that becomes the card's new `dueAt`.

New cards go through short **learning steps** first (1 minute, then 10 minutes). Once a card graduates to the **Review** state, LinguaCards counts it as *learned*.

### Why it's better

FSRS's default parameters were fitted on hundreds of millions of real Anki reviews. Benchmarks show it reaches the same retention as SM-2 with roughly **20–30% fewer reviews**. You can also turn the dial: a higher `desiredRetention` means you remember more but review more often.

### Where it lives in the code

- `src/lib/srs.ts` creates the scheduler (`DefaultScheduler` with FSRS-7, 90% retention, learning steps `1m, 10m`, relearning step `10m`, fuzz on), and provides `newSrsCard`, `reviewSrsCard`, and `previewIntervals`, which produces the labels on the rating buttons.
- `src/lib/store.ts` → `gradeCard` saves the updated card and appends a review log entry, which feeds the streak and heatmap.
- `src/app/study/page.tsx` runs the review session: it picks the most overdue card whose `dueAt ≤ now` and keeps "Again" cards in the session until they are due again.

## Project layout

```
src/
  app/
    page.tsx            Translate
    decks/page.tsx      Deck list, export/import
    deck/page.tsx       One deck: add/edit/delete cards
    study/page.tsx      Flip-and-rate review session
    quiz/page.tsx       Typing / multiple-choice quiz
    stats/page.tsx      Stats + heatmap
  components/           App components (flip card, heatmap, pair picker…) and shadcn/ui in components/ui
  lib/
    store.ts            localStorage-backed store (useSyncExternalStore) + actions
    srs.ts              ts-fsrs wrapper
    stats.ts            Streaks, heatmap grid
    quiz.ts             Answer normalization, fuzzy matching, distractors
    languages.ts        Language pairs → model IDs, speech voices
    speech.ts           speechSynthesis helper
    translator.worker.ts / useTranslator.ts   Transformers.js in a Web Worker
```

## Limitations

- Data is per browser and per device. Use **Export** to back it up or move it. Clearing site data erases it.
- `localStorage` holds about 5 MB, which is plenty for many thousands of text cards.
- Available pronunciation voices depend on your OS and browser. Arabic in particular may have no voice on some systems.
- opus-mt models are small. They handle words and short sentences well but are not as fluent as large cloud translators, so you can edit translations before saving.
