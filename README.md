# LinguaCards

Language-learning flashcards that run entirely in your browser, following a learning method based on research. The evidence review behind it is in [`docs/research/learning-english.md`](docs/research/learning-english.md): 75 sources, many of them meta-analyses, on retrieval practice, spacing, input, vocabulary, feedback, pronunciation, habits and children.


1. **Set up once**: pick the language you learn English in (French or Arabic) and, if you like, your name. Every word you save uses that pair, so translations never get mixed.
2. **Pick and sort**: choose ready-made lists, then go through their words one by one and tap **Already know** or **Should learn**. Words you already know set your level; the others are what you study.
3. **Add your own words**: type a word, get its translation on-device with Transformers.js, and press Enter to add it to **My words**.
4. **Study**: flip the card and rate it **Again / Hard / Good / Easy**. The FSRS spaced-repetition algorithm decides when you see it next.
5. **Track**: see words learned, your study streak, recall rate, and a heatmap of your study activity.
6. **Stay motivated**: set a daily goal and collect badges along the way.

The interface is available in **English, French and Arabic** (right-to-left).

There is **no backend, no database and no account**. Your words, your profile and your review history are stored in your browser's `localStorage`. Translation models are downloaded from the Hugging Face Hub the first time you use them, and the browser caches them after that.

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

To serve the production build locally: `npm start` (runs `npx serve out`). The export uses trailing slashes (`out/my-words/index.html`), so reloading `/my-words/?tab=known` works on any static host.

## Deploying to Vercel

The site is fully static (`output: "export"`), and Vercel serves it from its CDN with no server functions. `vercel.json` sets:

- Install: `npm ci --ignore-scripts`. The skipped install scripts only download native Node binaries (for example `onnxruntime-node`), which the in-browser models don't use.
- Build: `npm run build`, with the Next.js framework preset.
- Headers: `nosniff` and a referrer policy. Vercel already caches the hashed files in `/_next/static/` for a long time.
- Node version: 24, from `engines` in `package.json`.

To deploy from Git:

1. Push this repository to GitHub, GitLab or Bitbucket.
2. On [vercel.com/new](https://vercel.com/new), import the repository and click **Deploy**. The settings come from `vercel.json`, so nothing needs changing.

Every push to `main` then goes to production, and other branches get preview URLs.

To deploy from your machine instead:

```bash
npx vercel        # preview deployment (asks you to log in and link the project the first time)
npx vercel --prod # production
```

Data stays in each visitor's browser (`localStorage`), so each domain has its own data. Moving from `localhost` to the Vercel URL, or later to a custom domain, starts empty. Use **Export** and **Import** at the bottom of the My words page to carry data over.

## Features

- **Home** (`/`): explains the method in seven principles, each linked to its sources, with a forgetting-curve illustration of spaced review, the myths the research doesn't support, and its limits. Principles the app doesn't implement yet are marked "In development".
- **Menu**: **My words · Study · Stories · Stats**. Everything about your words (My words, ready-made lists, sorting, Add words and a word's page) sits under **My words**. The interface talks about **words** and **lists**; in the code a saved word is a `Flashcard`.
- **First use** (`/start`): the first time you open a page that needs your words, the app asks once for the language you learn English in (Français or العربية) and, optionally, your name (at most 30 characters, kept in this browser and in backups, shown in the word scenes instead of "You"). Both can be changed later on Stats. Changing the language on Stats starts the new language afresh: after a confirmation that offers a backup first, it deletes your words in every other language and their Already know marks. Your streak, badges and review history stay. If you have no words yet, **Continue** leads straight to picking lists; otherwise it takes you where you were going.
- **My words** (`/my-words`): your one list, in two parts: **Should learn** and **Already know**, with a count on each tab (`?tab=known` opens the second). It greets you by name, says how many words are due today and shows your **level**. Filter by ready-made list or your own words, search, or filter by tag. **I know this** moves a word to Already know; **Learn again** moves it back, and it comes up in today's study without counting as a review. Deleting a ready-made word you sorted as Already know (and never studied) leaves it to sort again. The English side of a ready-made word can't be edited: the list knows the word by it. Buttons lead to Study, Quiz, **Pick lists** and **Add your own words**, and the backup sits at the bottom: **Export/Import** downloads or restores a JSON backup, which matters because your data lives only in this browser. Import checks the file first, shows what it contains and asks before replacing your data. Old backups with several lists are moved into My words the same way as old saved data.
- **Level**: every word in Already know is a point, and a word from an advanced list is worth two. Starter from 0 points, then A1 at 100, A2 at 400, B1 at 1,000 and B2 at 2,000. Sorting is not studying: it never adds reviews or earns badges.
- **Add words** (`/add`): the pair is always English and your language. Choose whether you type in English or in your language; the word is always saved English first. The input looks like the flashcard it becomes. Type a word and press Enter to translate, edit the translation or type your own, then press Enter again to add it to My words. A word that is already in My words (same English word and translation) isn't added twice. The translator is chosen for you: the small Opus-MT model when the pair has one, otherwise NLLB-200, which is downloaded only after you click **Download and translate**. **Recently added** shows your latest own words, each with a pencil to edit its details, and **Study my own words**.
- **Richer cards**: the card editor (**More details…**, or the pencil on a card) adds an **example sentence** (with a speaker button), **notes**, **tags** and a **picture**. You can pick a picture file or paste one. Pictures are shrunk to 320 px WebP (or JPEG) of about 10–30 KB, because they are stored in `localStorage` with everything else. The example, notes and picture show on the answer side while you study.
- **Ready-made lists** (`/words`): about 3,500 English words in 35 lists of 100 by theme: 20 everyday lists (greetings, people, numbers, food, core verbs…), most useful words first, and 15 **advanced** lists with harder words on the same topics, shown under their own heading. A word from an advanced list is worth 2 points toward your level. Each word has a French or Arabic translation, an emoji picture where one fits, and an English example. Tick the lists you want and press **Continue**; each list shows how many of its words are still to sort.
- **Sorting** (`/sort?lists=…`): the chosen lists' unsorted words appear one at a time, with picture, audio, translation and example. Tap **Already know** or **Should learn**, or press **1** or **2** (physical keys, so they work on any keyboard layout). **Undo** takes back the last choices. Leaving and coming back resumes at the next unsorted word. The end screen shows how many went each way and your level, with **Study** and **Pick more lists**.
- **Stories** (`/story`): 40 short reading stories, two per ready-made list, with French and Arabic translations. They were written with AI and checked by a second reviewer, and each uses only words from its own list and earlier lists (plus basic words like "the" or "is"), so you know almost every word. After a study session, **Read a story with these words** opens the story that uses the most of the words you just studied. Every word you've met is tappable and shows its meaning, picture, example and audio; words studied today stand out. **Read aloud** uses the browser's voice. The ready-made stories are written ahead of time, not in the browser.
- **AI Story** (`/story/?ai=1`, the button on the Stories page): a new story written on this device from 12 random **Should learn** words; with fewer than 12 it uses all of them (at least 4 are needed). The model is Qwen3.5-0.8B (`q4f16`), about 470 MB, downloaded once after you agree. It needs WebGPU: on WASM every quantized build of the model fails to load (`GatherBlockQuantized` has no WASM kernel in onnxruntime-web), so a browser without WebGPU is told up front, before any download, that it can't run the story writer and is pointed to the ready-made stories. The story is written one sentence at a time, and every sentence and the title pass the same child-safety filter as the example sentences; a story that fails is rewritten once. Words that did not make it into the story are listed under it. **Show translation** and the quiz use the on-device translator. The quiz has up to 8 questions and is practice only: it does not change your review schedule or count toward badges. Nothing is saved. The story is labelled as written by AI on this device and may contain mistakes.
- **Word page** (`/word?w=…&lang=…&to=…`): tap a word in a list, in Recently added, on the ready-made lists page, on the answer side while studying (**See everything about this word**) or in a story, and a whole page about it opens. From study and stories it opens as a layer on top, so Back or Escape returns you to the same card or the same place in the story. The page shows:
  - **In real life**: four short conversations that use the word, each at a place ("At the bakery") with a picture, audio for every line and its French or Arabic translation. Swipe them on a phone. On a computer, use the round arrows, the ← → keys or the row of places. About 2,000 scenes were written ahead of time for the first ~500 ready-made words (the first 25 of each everyday list and all of Greetings), with AI and checked by a second pass for natural English, correct translations and simple words (`public/scenes/<list>.json`, loaded one list at a time; places and their pictures are in `public/scenes/_places.json`). The other ready-made words, and your own words, get real example sentences from Tatoeba and pictures from the matching Wikipedia article instead, loaded when you open the word.
  - **Meaning**, word type, written pronunciation and recorded UK/US audio from the Free Dictionary API, with Wiktionary as a fallback and for other languages. A definition is translated on your device; if the translation model isn't downloaded yet, a **Translate** button asks first.
  - **Pictures**: for ready-made words, pictures from Wikimedia Commons, chosen ahead of time and checked by eye (all of them are in `docs/pictures.html`, made by `scripts/contact-sheet.mjs`). For your own words, pictures only come from a Wikipedia article whose title matches the word, never from open search.
  - **Did you know?**: the start of the Wikipedia article in your language, **Words that go with it** from Datamuse (tap one to open its page), and the credits each free licence asks for.
  Everything runs in your browser: only the word you look up is sent, to those public sources, with no key and no account. Answers are kept in the browser's Cache API (not in `localStorage`, which holds your data). Live sentences and word partners pass a small filter of words unsuitable for children.
- **Study** (`/study`, or `/study?list=…` for one list and `&tag=…` for one tag): only **Should learn** words are studied, following the research method:
  - **Recall first, no typing**: a word appears and you think of the answer, then tap **Show answer** (or Space). One tap says how it went: **Forgot**, **Almost** or **Knew it**. Recalling in your head works about as well as typing the answer (Smith, Roediger & Karpicke 2013), as long as you try before you look. For children, or anyone who prefers it, the **Pick** mode shows four answers to tap instead, graded automatically. The choice is remembered.
  - **A first look at new words**: a brand-new word is shown first (both sides, picture, example, audio) and asked a minute later. The first look isn't given to the scheduler as a rating.
  - **Both directions**: once you know a word one way, it is also asked the other way (meaning → English), starting the next day.
  - **New words are capped per day** (10 by default, set on Stats) and mixed in among reviews, so reviews never pile up.
  - Each grade button shows the interval it would give (for example `10 min`, `3 days`). Keyboard: Space or Enter shows the answer, 1–3 rate it, P plays the word. Shortcuts use the physical keys, so they also work on an Arabic layout. Words you get wrong come back after a short step in the same session, and the page waits for them. **Check again** on the finished screen starts a new session, for example after midnight.
- **Quiz** (`/quiz`, or `/quiz?list=…`): ten random words you have already started studying, in either direction, answered by **multiple choice** (the default; needs at least 4 different answers, otherwise the quiz uses typing) or by **typing**. Typed answers ignore case, Latin accents, punctuation and Arabic diacritics, and a small typo counts as "close enough". If several cards share a prompt, any of their answers is accepted. Picking an option is simply right or wrong. The quiz is practice only and does not change the FSRS schedule.
- **Stats** (`/stats`): your daily goal and new words per day, an if-then **study plan** ("When I get home, I will study for 5 minutes"), words learned (in your current language), the current streak and total days studied, words due, reviews today, 30-day recall rate, a 26-week activity heatmap, badges, a **My words** card (Should learn and Already know counts, your level and how far you have sorted each list) and a **You** card to change your name and language.
- **Daily goal and badges**: choose how many reviews a day you aim for (5 to 100, default 20). The ring in the header fills up as you review. Reaching the goal, or earning a badge, sets off confetti and a toast (no animation if your system asks for reduced motion). There are 14 badges for reviews, streaks, learned cards, goal days and perfect quizzes. Once earned, a badge is kept, even if a card later lapses or a streak breaks. The streak forgives one missed day (two in a row break it), and Stats also shows total days studied, so a missed day never wipes out progress. First looks at new words don't count as reviews. The goal, goal days and badges are saved in the same data and included in backups.
- **Interface language**: the language button in the header switches between English, Français and العربية. The first visit follows the browser's language. Arabic switches the whole layout to right-to-left. The direction is set before the first paint, so the page doesn't flip after loading. Numbers use Western digits.

## Translation models

The app knows 14 languages (English, French, Spanish, German, Italian, Arabic, Portuguese, Dutch, Russian, Turkish, Hindi, Chinese, Japanese and Korean); My words uses English with French or Arabic. The Add words page picks the engine for you. It uses Opus-MT when there is a model for the pair, and asks once before downloading NLLB-200 for the others.

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

[`Xenova/nllb-200-distilled-600M`](https://huggingface.co/Xenova/nllb-200-distilled-600M) is Meta's *No Language Left Behind* model. One model translates between any two of its 200 languages, so it also covers pairs Opus-MT can't, such as French → Arabic or English → Japanese. The cost is size: the 8-bit encoder and decoder are about **900 MB** together, and translation is slower. If you pick a pair Opus-MT has no model for, the page asks before downloading it. You can also type the translation yourself instead.

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
    page.tsx            Home: the research-based method
    start/page.tsx      First use: your language and name
    my-words/page.tsx   My words: Should learn / Already know, level, filters, backup
    add/page.tsx        Add your own words (translate, save English first)
    words/page.tsx      Ready-made lists: pick the lists to sort
    sort/page.tsx       Sort words one by one: Already know / Should learn
    decks/, deck/       Old addresses: send you to My words
    word/page.tsx       Word page (also opened as a layer from study and stories)
    story/page.tsx      Stories with tappable words
    study/page.tsx      Flip-and-rate review session
    quiz/page.tsx       Typing / multiple-choice quiz
    stats/page.tsx      Stats + heatmap
  components/word/      Word page: header, scene stage (swipe, arrows, places row), overlay
  components/ai-story.tsx, story-quiz.tsx, story-text.tsx   AI Story page parts: writer, quiz, highlighted text
  components/           App components (flip card, card editor, heatmap, goal ring, badges…) and shadcn/ui in components/ui
  messages/             Interface strings per screen, in English, French and Arabic
  data/                 Ready-made word lists and their stories: the lists' small index (starter-packs.ts)
                        and their words (starter-words.ts, loaded only by the pages that show them)
  lib/
    store.ts            localStorage-backed store (useSyncExternalStore) + actions
    migrate.ts          Moves version 1 data (several lists) into My words
    mywords.ts          My words selectors: your words, lists, sorting queue, level
    starter-words.ts    Loads the ready-made lists' words on demand (one dynamic import, shared)
    profile.ts          Learner name and language, which pages need setup
    srs.ts              ts-fsrs wrapper
    stats.ts            Streaks, heatmap grid
    rewards.ts          Daily goal and badge rules
    i18n.ts / format.ts Interface language, messages, Intl formatting
    image.ts            Picture shrinking for cards
    story.ts            Story word matching (word forms, phrases) and story choice
    confetti.ts         Celebration animation
    quiz.ts             Answer normalization, fuzzy matching, distractors
    languages.ts        Languages, engines, pair → model (Opus-MT / NLLB), speech voices
    speech.ts           speechSynthesis helper
    translator.worker.ts / useTranslator.ts   Transformers.js in a Web Worker
    ai-story.ts         AI Story: random Should learn words, sentence checks, quiz questions
    story.worker.ts / useStoryWriter.ts / story-model.ts   AI Story model (Qwen3.5-0.8B) in a Web Worker
    word/               Word page data: which word and list (target), the free sources and their parsing,
                        Cache API fetch, child-safety filter, scenes loading and checks, useWordData
public/scenes/          Ready-made scenes, one JSON file per list, plus _places.json
scripts/contact-sheet.mjs   Writes docs/pictures.html, every chosen picture with its credit
```

## Limitations

- Data is per browser and per device. Use **Export** to back it up or move it. Clearing site data erases it.
- `localStorage` holds about 5 MB, which is plenty for many thousands of text cards, or a few hundred cards with pictures. If the browser refuses to save, a banner says so.
- Available pronunciation voices depend on your OS and browser. Arabic in particular may have no voice on some systems.
- opus-mt models are small. They handle words and short sentences well but are not as fluent as large cloud translators, so you can edit translations before saving.
- The word page's free sources are run by volunteers and can be slow or down for a while. Each section then says it couldn't load and offers **Try again**; scenes and your own data still show. The English dictionary, word partners and audio exist for English words only.
- NLLB needs about 900 MB of download and cache space and a fair amount of memory. It works best in a desktop browser.
