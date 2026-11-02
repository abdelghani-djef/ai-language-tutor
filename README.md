# LinguaCards

Language-learning flashcards that run entirely in your browser:

1. **Translate**: type a word or sentence and translate it on-device with Transformers.js.
2. **Save**: keep the translation (edited if you like) as a flashcard in a deck.
3. **Study**: flip the card and rate it **Again / Hard / Good / Easy**. The FSRS spaced-repetition algorithm decides when you see it next.
4. **Track**: see cards learned, your study streak, recall rate, and a heatmap of your study activity.
5. **Stay motivated**: set a daily goal and collect badges along the way.

The interface is available in **English, French and Arabic** (right-to-left).

There is **no backend, no database and no account**. Decks, cards and review history are stored in your browser's `localStorage`. Translation models are downloaded from the Hugging Face Hub the first time you use them, and the browser caches them after that.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) App Router, exported as a static site (`output: "export"`) |
| UI | [shadcn/ui](https://ui.shadcn.com) (Base UI primitives) + Tailwind CSS v4, themes: System, Light, Dark, and Pink / Blue for kids (rounded fonts, bigger corners), picked from the palette button in the header |
| Translation | [Transformers.js](https://huggingface.co/docs/transformers.js) (`@huggingface/transformers`) running in a Web Worker |
| Spaced repetition | [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (FSRS-7) |
| Pronunciation | The browser's built-in `speechSynthesis` (free, offline on most systems) |
| Storage | `localStorage`, with JSON export and import for backups |
| Interface languages | English, French, Arabic: a small typed message system (`src/lib/i18n.ts`) with `Intl` for plurals, numbers, dates and language names |
| Tests | Vitest |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm test           # unit tests (FSRS wrapper, streaks/heatmap, quiz answers, rewards, translations)
npm run lint
npm run build      # static site in out/, which you can host anywhere (GitHub Pages, Netlify, S3…)
```

To serve the production build locally: `npm start` (runs `npx serve out`). The export uses trailing slashes (`out/deck/index.html`), so reloading `/deck/?id=…` works on any static host.

## Deploying to Render

The site is fully static, so it runs as a free [Render static site](https://render.com/docs/static-sites). `render.yaml` in the repo root is a Render Blueprint that sets everything up:

- Build: `npm ci --ignore-scripts && npm run build`. The skipped install scripts only download native Node binaries, which the in-browser models don't use.
- Publish directory: `out`.
- Node version: from `.node-version` (24).
- Headers: long-lived caching for the hashed files in `/_next/static/`, plus `nosniff` and a referrer policy.
- Auto-deploy: every push to the connected branch.

To deploy:

1. Push this repository to GitHub, GitLab or Bitbucket.
2. In the Render Dashboard, choose **New → Blueprint**, pick the repository, and apply. Render creates the `linguacards` static site and gives it an `onrender.com` URL.

To set it up by hand instead, choose **New → Static Site** with the same build command and `out` as the publish directory.

Data stays in each visitor's browser (`localStorage`), so each domain has its own data. Moving from `localhost` to the Render URL, or later to a custom domain, starts empty. Use **Export** and **Import** on the Decks page to carry data over.

## Features

- **Translate** (`/`): pick a **From** and **To** language, use **swap** to reverse them, choose a model (**Opus-MT** or **NLLB-200**, see below), then press **Translate** or Ctrl+Enter. Long text is translated sentence by sentence, keeping line breaks. You can edit the translation before you save it. Speaker buttons read either side aloud.
- **Decks** (`/decks`): create, rename and delete decks. Each deck shows its total, due and learned counts. **Export/Import** downloads or restores a JSON backup, which matters because your data lives only in this browser. Import checks the file first, shows what it contains and asks before replacing your data, with an **Export current** button right there.
- **Deck** (`/deck?id=…`): add cards by hand, edit or delete cards (with **Undo**), and see each card's FSRS state and next due time. Deleting cards or decks keeps their review log, so past study days still count toward your streak and heatmap. Search the deck's cards, or filter them by tag and then study or quiz only that tag.
- **Richer cards**: the card editor (**More details…**, or the pencil on a card) adds an **example sentence** (with a speaker button), **notes**, **tags** and a **picture**. You can pick a picture file or paste one. Pictures are shrunk to 320 px WebP (or JPEG) of about 10–30 KB, because they are stored in `localStorage` with everything else. The example, notes and picture show on the answer side while you study.
- **Study** (`/study`, or `/study?deck=…` for one deck): reviews every card due today, most overdue first. Each rating button shows the interval it would give (for example `10 min`, `3 days`). Keyboard shortcuts: Space flips, 1–4 rates, P pronounces; they stay out of the way of focused buttons and links. Cards you get wrong come back after a short learning step in the same session, and the page waits for them. **Check again** on the finished screen starts a new session, for example after midnight.
- **Quiz** (`/quiz?deck=…`): ten random cards in either direction, answered by **typing** or by **multiple choice** (needs at least 4 different answers). Typed answers ignore case, Latin accents, punctuation and Arabic diacritics, and a small typo counts as "close enough". If several cards share a prompt, any of their answers is accepted. Picking an option is simply right or wrong. The quiz is practice only and does not change the FSRS schedule.
- **Stats** (`/stats`): your daily goal, cards learned, current and longest streak, cards due, reviews today, 30-day recall rate, a 26-week activity heatmap, badges, and per-deck progress.
- **Daily goal and badges**: choose how many reviews a day you aim for (5 to 100, default 20). The ring in the header fills up as you review. Reaching the goal, or earning a badge, sets off confetti and a toast (no animation if your system asks for reduced motion). There are 14 badges for reviews, streaks, learned cards, goal days and perfect quizzes. Once earned, a badge is kept, even if a card later lapses or a streak breaks. The goal, goal days and badges are saved in the same data and included in backups.
- **Interface language**: the language button in the header switches between English, Français and العربية. The first visit follows the browser's language. Arabic switches the whole layout to right-to-left. The direction is set before the first paint, so the page doesn't flip after loading. Numbers use Western digits.

## Translation models

Decks can use any two of 14 languages: English, French, Spanish, German, Italian, Arabic, Portuguese, Dutch, Russian, Turkish, Hindi, Chinese, Japanese and Korean. You choose one of two engines on the Translate page, and the choice is remembered.

### Opus-MT (default)

Each direction uses one small MarianMT model from the [opus-mt](https://huggingface.co/Helsinki-NLP) family, converted to ONNX by Xenova:

| Pair | Models |
| --- | --- |
| English ↔ French | `Xenova/opus-mt-en-fr`, `Xenova/opus-mt-fr-en` |
| English ↔ Spanish | `Xenova/opus-mt-en-es`, `Xenova/opus-mt-es-en` |
| English ↔ German | `Xenova/opus-mt-en-de`, `Xenova/opus-mt-de-en` |
| English ↔ Italian | `Xenova/opus-mt-en-it`, `Xenova/opus-mt-it-en` |
| English ↔ Arabic | `Xenova/opus-mt-en-ar`, `Xenova/opus-mt-ar-en` |

The app loads them with 8-bit quantization (`dtype: "q8"`), which is about 75 MB per direction. They run in a Web Worker (`src/lib/translator.worker.ts`) so the page stays responsive while a model downloads or generates text.

To add an Opus-MT pair, add the language code to `OPUS_LANGS` in `src/lib/languages.ts`. That only works if a matching `Xenova/opus-mt-xx-yy` model exists.

### NLLB-200 (optional)

[`Xenova/nllb-200-distilled-600M`](https://huggingface.co/Xenova/nllb-200-distilled-600M) is Meta's *No Language Left Behind* model. One model translates between any two of its 200 languages, so it also covers pairs Opus-MT can't, such as French → Arabic or English → Japanese. The cost is size: the 8-bit encoder and decoder are about **900 MB** together, and translation is slower. If you pick a pair Opus-MT has no model for, the page offers to switch to NLLB.

The worker passes `src_lang` / `tgt_lang` as FLORES-200 codes (`eng_Latn`, `arb_Arab`, `jpn_Jpan`…), which are stored per language in `LANGUAGES`. To add a language, add an entry with its FLORES-200 code and a speech tag.

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
- `src/lib/store.ts` → `isDue` decides what can be studied now. FSRS schedules to the minute, but people think in days, so New and Review cards are available for their whole due day. Learning and relearning steps (1m, 10m) wait for their exact time.
- `src/app/study/page.tsx` runs the review session: it picks the most overdue available card and keeps "Again" cards in the session until their step is up.

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
  components/           App components (flip card, card editor, heatmap, goal ring, badges…) and shadcn/ui in components/ui
  messages/             Interface strings per screen, in English, French and Arabic
  lib/
    store.ts            localStorage-backed store (useSyncExternalStore) + actions
    srs.ts              ts-fsrs wrapper
    stats.ts            Streaks, heatmap grid
    rewards.ts          Daily goal and badge rules
    i18n.ts / format.ts Interface language, messages, Intl formatting
    image.ts            Picture shrinking for cards
    confetti.ts         Celebration animation
    quiz.ts             Answer normalization, fuzzy matching, distractors
    languages.ts        Languages, engines, pair → model (Opus-MT / NLLB), speech voices
    speech.ts           speechSynthesis helper
    translator.worker.ts / useTranslator.ts   Transformers.js in a Web Worker
```

## Limitations

- Data is per browser and per device. Use **Export** to back it up or move it. Clearing site data erases it.
- `localStorage` holds about 5 MB, which is plenty for many thousands of text cards, or a few hundred cards with pictures. If the browser refuses to save, a banner says so.
- Available pronunciation voices depend on your OS and browser. Arabic in particular may have no voice on some systems.
- opus-mt models are small. They handle words and short sentences well but are not as fluent as large cloud translators, so you can edit translations before saving.
- NLLB needs about 900 MB of download and cache space and a fair amount of memory. It works best in a desktop browser.
