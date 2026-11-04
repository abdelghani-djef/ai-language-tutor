# Word page: go deep on one word

Status: built, 2026-11-04 (approved 2026-11-03). The places of scenes live in `public/scenes/_places.json`, so the "places" list can have `places.json`.

## Why

Learners in LinguaCards see a word as a flip card: the word, its translation, one example, maybe an emoji. That is enough to memorise it but not to *use* it. The owner wants a learner to be able to tap a word and get a whole page about it: how it is used in different everyday situations, pictures of it, what it means, and what it goes with, all translated into the learner's language.

## Goals

- Tapping a word anywhere it appears opens a full page for that word.
- The page shows the word in **scenes**: short everyday conversations that use it, each with a picture, audio, and a translation.
- Facts about the word (meaning, pronunciation, word partners) come from **real dictionaries**, not from AI.
- Everything runs in the visitor's browser. **No server**, no API keys, no account, nothing paid.
- The page works in English, French and Arabic interfaces, right to left for Arabic, and at phone width.

## Non-goals (for now)

- New AI stories built from these words. The owner wants that **later**, as its own step.
- AI that runs while the app is used (in-browser LLMs were tried for stories and were too slow and unreliable on the owner's machine).
- Editing or saving scenes. The page is for reading and listening.

## Anti-goals

- A page that feels slow: tapping a ready-made word must open its scenes instantly.
- Made-up facts: definitions, pronunciations and word partners must not be invented by AI.
- Breaking the "your data stays in this browser" promise. Only the word being looked up leaves the browser, sent to the public sources below.
- Wrong pictures. A wrong picture is worse than none: fall back to the emoji or to no picture.

## The page (agreed layout)

Layout A from the mockups, with the scenes idea folded in. One long page, top to bottom:

1. **Header**: a big picture of the word, the word, its translation with a speaker button, word type (noun, verb…) and written pronunciation (/brɛd/). Real recorded UK and US pronunciations when the dictionary has them; otherwise the browser's voice, as today.
2. **In real life**: a row of scenes swiped sideways (with dots, and arrow buttons for mouse and keyboard). Each scene: a place label with an emoji ("🥖 At the bakery"), a picture, a 2–4 line conversation with the word highlighted, a 🔊 to hear it, and the translation under it.
3. **Meaning**: a short English definition or two from the dictionary, each with its translation.
4. **Pictures**: a few more photos of the word.
5. **Did you know?**: the first lines of the Wikipedia article in the learner's language, with "Read more" linking to Wikipedia. Hidden when there is no article.
6. **Words that go with it**: word partners such as "fresh bread", "a slice of bread", "crumbs". Tapping one opens that word's page.
7. **Credits**: a small line per picture and sentence source, as their free licences require.

Sections with no content are hidden, never shown empty.

### On a computer (wide screens)

The owner asked for arrows to move between scenes on the web. Mockup: `.superpowers/brainstorm/*/content/word-page-desktop-v2.html`.

- **Header side by side**: the picture on the left, the word set very large (Fraunces) on the right with its translation and the pronunciation buttons.
- **Scenes as a wide stage**: one scene at a time, picture on the left and the conversation on the right. Who speaks ("Baker", "You") sits beside each line, with its translation underneath and a speaker button.
- **Arrows**: large round previous and next buttons on either side of the scene. The previous button is faded on the first scene and the next button on the last. The keyboard's left and right arrow keys also move between scenes, swapped for right-to-left.
- **Places row** under the scene: all four places ("🥖 At the bakery", "🍳 At breakfast"…) as buttons that show where you are and jump to one. This replaces the dots on wide screens.
- **Below**: the pictures across the full width, then Meaning, Words that go with it and Did you know? side by side in three columns instead of stacked.
- On a phone it stays as agreed: swipe with dots, and small arrows at the scene's edges for anyone who prefers tapping.

## Where it opens from

Tapping a word should open its page from every place a word appears: rows on a list's page, the answer side while studying, the tappable words in a story (the existing word details box gets a "See everything about this word" link), Recently added on Add words, and the ready-made lists page. The back button returns to where the learner was.

The page needs to work for a word that is not saved yet (for example a word partner tapped from another word's page, or a word in a ready-made list not added yet).

## Where the content comes from

All of these were checked from the command line on 2026-11-03: they answer without a key and send `Access-Control-Allow-Origin`, so the browser can call them directly.

| Content | Source | Notes |
|---|---|---|
| Scenes for the ~500 ready-made words | Written ahead of time by AI, checked by a second pass, shipped in the app | Same process as the 40 stories in `src/data/starter-stories.ts`. 4 scenes per word, each with French and Arabic translations. |
| Scenes for the learner's own words | Real example sentences from Tatoeba (`api.tatoeba.org/unstable/sentences`, needs `sort=`; translations via `trans:lang=fra`/`ara`), plus the dictionary's own examples | Single sentences, not conversations. When no human translation exists (common for Arabic), translate on the device with the app's existing translator (`useTranslator`). Licence CC BY 2.0 FR, credit the sentence owner. |
| Meaning, word type, examples, synonyms, recorded UK/US audio | Free Dictionary API (`api.dictionaryapi.dev/api/v2/entries/en/<word>`) | English only. Run by a volunteer, sometimes returns 502: retry once, then fall back to Wiktionary. Audio files carry their own licence; credit them. |
| Meaning for non-English words, and fallback | Wiktionary REST (`<lang>.wiktionary.org/api/rest_v1/page/definition/<word>`) | Returns HTML fragments; strip to text. |
| Word partners and related words | Datamuse (`api.datamuse.com/words?rel_jjb=<word>` for "fresh bread"-style adjectives, `rel_trg=` for related words) | English only. |
| Pictures for ready-made words | Wikimedia Commons, **chosen ahead of time** and checked to actually show the word | Store file title, thumbnail URL, author and licence. Abstract words ("the", "yes", "please") get no photo and keep their emoji. |
| Pictures for own words | Wikimedia Commons search, live (`commons.wikimedia.org/w/api.php?...generator=search&gsrnamespace=6...&origin=*`) | Show the top few with credits. |
| Did you know? | Wikipedia summary in the learner's language (`<lang>.wikipedia.org/api/rest_v1/page/summary/<title>`), found through the English article's language links (`prop=langlinks`) | No translation needed: Wikipedia links articles across languages. English summary when the learner's language has no article. Licence CC BY-SA, link back. |

The translation of dictionary definitions uses the on-device translator, which needs the model download the first time (Add words already handles this flow and its consent prompt).

## Decided by the owner

- Browser only, no server, nothing paid.
- Layout A with swipeable scenes.
- Dictionaries provide the facts; AI provides the conversations and their translations.
- AI work happens ahead of time for the ready-made words; own words get real example sentences instead of conversations.
- Stories from these words come later.

## Constraints

- Next.js 16 static export (`output: "export"`): no API routes, no dynamic route segments at build time. A word page is a query-string route, like `/deck?id=…` today.
- `localStorage` already holds all user data and is limited to about 5 MB. Fetched word data must not be cached there.
- Bundle size: the ready-made scenes (roughly 500 words × 4 scenes × 3 languages) must not load with the app. Load them only when a word page opens, one ready-made list at a time.
- Interface text goes through `defineMessages({en, fr, ar})` with the app's plural rules and the list/word vocabulary set in the previous change.
- Logical Tailwind classes for right-to-left; existing look (font-display headings, shadcn/ui on Base UI, five themes).
- Every external call can fail or be slow: the page renders its own content first (word, translation, saved example, ready-made scenes) and fills the online sections as they arrive, each with a quiet "couldn't load" state, never an error page.

## Calls made after the builder check (not discussed with the owner; check these)

1. **Scene pictures.** Ready-made scenes take place in a limited set of places (bakery, kitchen, school, park…). Pick one checked Commons picture per *place* (likely 60–100 places), shared by every scene set there, instead of a picture per scene. Scenes for own words are single sentences with no place, so they show no picture.
2. **Live pictures and "Did you know?" for own words must be a confident match.** No raw Commons search. Use the Wikipedia article only when the summary's `type` is `standard` (not a disambiguation page) and its title matches the word, ignoring case; take pictures from that article (`rest_v1/page/media-list`, images only, with credits). No match means no pictures and no "Did you know?", and the emoji or the learner's own picture is used.
3. **Child safety.** The app has kids' themes, so live content stays conservative: pictures only come from a matching Wikipedia article (point 2), never from open search. Tatoeba sentences pass a small blocklist of crude or violent words before they are shown; a sentence that fails is skipped. No setting.
4. **The learner's language** (what scenes, meanings and sentences are translated into) is the other side of the saved word: for the ready-made lists that is French or Arabic. For a word that isn't saved, it is the translation language chosen on the ready-made lists page. The interface language only controls the interface. Ready-made translations exist for French and Arabic; for any other language, the on-device translator is used, and nothing is shown when it isn't available.
5. **Leaving study or a story doesn't lose your place.** The word page is a component that opens as a full-screen layer over study and stories (Back or Escape closes it and returns focus to the tapped word), and also as its own route (`/word?…`) for links from lists, Add words and other word pages. Study and story state is never torn down.
6. **No surprise downloads.** If the on-device translation model isn't downloaded yet, the Meaning section shows the English text with a "Translate" button that starts the same download flow as Add words. Once the model is in the browser's cache, translations appear on their own.
7. **Checking the pre-picked pictures** is done by an AI pass that looks at each thumbnail (vision), rejecting anything that doesn't plainly show the word or place, is unsuitable for children, or has an unclear licence. A contact-sheet page under `docs/` lets the owner glance over all picks afterwards; it isn't required.

## Left to the builder

- Route name and query parameters, and how a word is identified when it is not a saved word.
- Which side of a saved word is "the word" for the dictionary lookup when neither side is English (the English dictionary sources only apply to English; Wiktionary, Tatoeba, Commons and Wikipedia work for other languages).
- Where fetched word data is cached (IndexedDB or the Cache API) and for how long.
- File format and location of the ready-made scenes and picture choices (for example one JSON file per list under `public/`, or a dynamically imported module per list).
- How the AI writing and checking of ~2,000 scenes is organised, as long as each scene is checked for natural English, correct translations, use of the word, and simple vocabulary at the level of the ready-made lists.
- Exact copy and visual details within the agreed layout.
- Tests: at least the parsing of each source's response and the choice of sources per word.
