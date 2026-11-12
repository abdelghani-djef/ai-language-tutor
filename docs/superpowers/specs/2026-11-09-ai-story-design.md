# AI story from my words — design

Status: built 2026-11-12. Approved in chat 2026-11-08/09; written 2026-11-09.

## Why

The Stories page today has 40 ready-made stories. Each uses one ready-made list's words, so a story rarely
matches the words a learner is actually working on, and learners with their own words get none. The owner
wants a story made **from the learner's own Should learn words**, on demand, followed by a short quiz on the
story's sentences.

## What the learner does (owner's flow)

1. On the Stories page, tap **AI Story**.
2. The app picks **10 to 20 random words from Should learn** (not all of them).
3. Wait a few seconds; the story appears.
4. When they have read it, a **Take a quiz** button appears.
5. The quiz shows the story's sentences one at a time; for each, the learner **picks its translation** from a
   few choices.

## Decided by the owner

- **Free and in the browser only.** No server, no API key, no paid service. The story is written by a small AI
  model running in the learner's browser.
- It lives **in the Stories page** ("AI-powered" storyteller), next to the ready-made stories.
- 10 to 20 random Should learn words per story.
- Quiz after the story: story sentences, pick the right translation.

## My calls (owner can overrule)

- **Engine:** Transformers.js, already a dependency (4.3.2), with the text-generation model
  `onnx-community/Qwen3.5-0.8B-Text-ONNX` (Apache-2.0, not gated; about 470 MB as `q4f16` on WebGPU). If it does not load or write well through Transformers.js 4.3.2, the fallback is
  `onnx-community/Qwen3-0.6B-ONNX` (about 570 MB, thinking turned off). No bigger "quality" model in this
  version.
- **Runs in its own Web Worker** (like the translator's worker), so the page never freezes. WebGPU only (see
  Changes after the gate: there is no WASM fallback).
- **Word count:** pick **12** words by default (inside the owner's 10–20). Small models drop words from long
  lists; 12 keeps most of them in. If Should learn has fewer than 10 words, use all of them; with fewer than
  **4**, the AI Story button explains that more words are needed (the quiz needs 4 different sentences).
- **Story shape:** English, simple (about A2 level), about 120–200 words, 8–14 sentences, with a short title.
  The prompt lists the words and asks for the story only. The app cleans the reply: drops anything before the
  title or after the story ("Sure! Here is…", notes, lists of words), and rejects a reply that is not a story
  (too short, mostly a list, or not English) and tries once more automatically.
- **Words the story missed:** the app checks which picked words appear (using the same word-form matching as
  today's stories, `highlightWords`). Used words are highlighted and tappable like in today's stories; missed
  words are listed under the story ("Not in this story: …"). No second generation pass for missed words.
- **Safe for children:** every sentence of the story passes the app's existing child-safety filter
  (`isCleanSentence` in `src/lib/word/clean.ts`, used today for live example sentences). A story with any
  sentence that fails is thrown away and written once more; if the second one fails too, the app says it could
  not write a story this time and offers **Try again**. Because of this check, the text is **not shown while it
  is written**: the learner sees "Writing your story…" with a live count of words written so far, and the story
  appears once it is finished and checked.
- **Showing it:** like today's stories: title, paragraphs, highlighted words that open the word panel, **Read
  aloud**, and **Show translation** (see below). A **New story** button picks a fresh random set and writes
  again.
- **First time:** the model is downloaded once. Before downloading, the app says how big it is and asks
  (one tap: **Download and write**), like the Add page does for the big translator; it shows a progress bar
  during the download and says it is only once. After that it starts straight away.
- **Translations (for Show translation and the quiz):** made by the app's existing on-device translator
  (Opus-MT en→fr / en→ar, about 75 MB each, already used on Add and the word page), sentence by sentence, not by
  the story model. The translator is downloaded the same way if it is not there yet.
- **Quiz:** up to 8 questions, one per story sentence (shortest and very long sentences skipped when there are
  more than 8). Each shows the **English sentence** and **4 choices**: its translation and the translations of 3
  other sentences from the same story. Same look and feedback as the current quiz's multiple choice.
  **Practice only**: it does not change the review schedule and does **not** count toward quiz badges (the
  answers are machine translations, and a new story is one tap away). At the end: score, **Try again** (same
  story, reshuffled) and **New story**.
- **Not saved:** the story lives only on the page. Leaving the page or tapping New story discards it. Nothing
  new goes into the saved data or backups.
- **Unsupported:** if the browser has no WebGPU, the app says up front, before any download, that this browser
  can't run the story writer because it has no graphics acceleration (WebGPU), and links the ready-made stories.
  If the model cannot run at all for another reason (out of memory), it says so and the ready-made stories stay
  available.
- **Labelled as AI:** the story says it was written by AI on this device and may contain mistakes; the
  translations say they are machine translations.
- Interface text in English, French and Arabic (Arabic right to left), like the rest of the app.

## Goals

- A learner with at least 4 Should learn words gets a readable story with most of their picked words in it, and
  a quiz on it, without any account, key or server.
- After the first download, a story appears within about 5–15 seconds on a recent computer or phone with
  WebGPU (20 seconds at most, see the pass mark under Risk).
- No story reaches the learner with a sentence that fails the child-safety filter.

## Non-goals

- Saving stories, story history, sharing.
- Choosing which words go in, or the story's topic or level (maybe later).
- Stories in French or Arabic; the story is always English (the learner learns English).
- Changing the review schedule or rewards from the AI story or its quiz.
- Any online AI service.

## Anti-goals (would make it a failure even if it "works")

- The page freezing while the model loads or writes.
- Downloading hundreds of MB without the learner agreeing first.
- Showing chat-style replies ("Sure! Here's your story…") or broken text as if it were a story — the earlier
  attempt failed exactly here (README, Stories: Qwen2.5-0.5B, slow without WebGPU and often wrote chat
  replies).
- Breaking or slowing the ready-made stories, or adding the model's code to every page's bundle.

## Constraints

- Static export (Next.js 16 `output: "export"`); no server code. Read `node_modules/next/dist/docs/` before
  writing Next.js code (see AGENTS.md).
- The model and translator files come from the Hugging Face Hub and are cached by the browser
  (`transformers-cache`), like the translator today.
- Existing pieces to reuse: `src/lib/story.ts` (`highlightWords`, `englishWord`), the story page's word
  buttons and panel, `src/lib/quiz.ts` (`choicesFor`, `shuffle`), `src/lib/mywords.ts` (`studyCards` for Should
  learn), the translator worker (`src/lib/translator.worker.ts`; it already translates one line at a time, so a
  story can be sent as one text with one sentence per line). The translator hook keeps only its latest request,
  so the sentences go in one request, not many in parallel.
- Tests are pure-function tests in `src/lib/__tests__`; word picking, reply cleaning, sentence splitting and
  quiz building belong in a lib module so they can be tested.

## Risk

The model has not been run through Transformers.js 4.3.2 in this app yet (the owner chose to skip a test run).
The first build step is to get stories out of it in the browser, before the UI and quiz are built.

**Pass mark (my call):** write 5 stories from 5 different random sets of 12 real Should learn words. The model
passes if at least 4 of the 5 are real stories after cleaning (no chat reply, no word list, English, 8+
sentences), those 4 use at least 8 of their 12 words on average, all 5 pass the child-safety filter, and each
takes at most about 20 seconds on WebGPU once downloaded.

**If it fails:** try the fallback model against the same mark. If both fail, **stop and go back to the owner**
with the sample stories and timings before building anything else. No other runtime or online service without
the owner's say.

## Left to the builder

File layout, worker message format, prompt wording and sampling settings, exact sentence splitting, how the
words used/missed are shown, loading and progress UI details, and message wording (in the app's plain style).

## Changes after the gate

The model gate (Task 2) and the final browser check left three changes to this design, all built on 2026-11-12:

- **Sentence-by-sentence writing.** Asking the model for the whole story at once dropped about half of the
  words (gate: 6.0 of 12 used, against 8.8 with one sentence per word). The story is now written one sentence per
  word: each step sees the story so far, a sentence without its word is retried once, then a title is written.
- **Progress shows sentences, not words.** While the story is written, the learner sees "`<done>` of `<total>`
  sentences" instead of the live count of words written.
- **WebGPU only.** Every quantized export of the story model (q4, q8, also of the Qwen3-0.6B fallback) fails to
  load on onnxruntime-web's WASM backend ("Could not find an implementation for GatherBlockQuantized"). The
  worker loads `q4f16` on WebGPU only; without a WebGPU adapter (with 16-bit float shaders) the page says so before
  any download. The WebGPU path has not been run on the build machine (no adapter there).
