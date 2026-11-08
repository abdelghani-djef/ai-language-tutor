# My words, sorting, and bigger lists

Status: approved 2026-11-06; part 1 built 2026-11-07; content built 2026-11-07 (owner change: new words have no prepared scenes or pictures; the word page loads them live). Plans: `docs/superpowers/plans/2026-11-06-my-words-and-sorting.md` (the app) and `docs/superpowers/plans/2026-11-06-bigger-lists.md` (the words). Written from the brainstorming conversation of 2026-11-06. Lines marked **(my call)** were not discussed with the owner: they were decided while writing, and the owner can change them.

## Why

The owner tried the app and found it confusing. There are many lists, each with its own language pair. Adding a ready-made list makes yet another list. The language pair has to be chosen again on Add words. New words are studied whether or not the learner already knows them. And the ready-made lists are short, about 25 words each, with nothing for learners past the basics.

The owner wants an app where:

- you set yourself up **once**: your language and your name;
- you have **one list**, My words;
- you **pick** the ready-made lists you want, then **sort** their words into what you already know and what you should learn;
- what you already know shows your **level**, and Study only teaches what you should learn;
- the ready-made lists are **big enough** (100 words each), with **advanced** lists for learners who know the basics.

Who it is for, unchanged: people learning **English** whose own language is **French or Arabic**. The interface can be English, French or Arabic, and Arabic is right to left.

## Goals

1. **First use, once.** On first use the learner picks their language (French or Arabic) and can type their name. It is saved and used everywhere: ready-made lists, Add words, Study, Quiz, Stories, the word page. No page asks for the language pair again.
2. **One list: My words.** Every learner has one list. It has two parts: **Should learn** and **Already know**.
3. **Pick, then sort.** The learner ticks one or more ready-made lists and presses **Continue**. The words of those lists then appear **one at a time** with two buttons: **Already know** and **Should learn**.
   - Already know puts the word in the Already know part, which sets the learner's level.
   - Should learn puts the word in the Should learn part.
4. **Study shows only Should learn words.** Already know words never come up in Study.
5. **Level.** The app shows the learner's level, worked out from Already know.
6. **100 words per list.** Each of the 20 ready-made lists grows from about 25 to 100 words.
7. **Advanced lists.** About 15 new lists named "Advanced: <topic>", such as "Advanced: Food and drink", each with 100 harder words.
8. **Every ready-made word keeps a full word page**: scenes and pictures, written and checked the way the current 496 were.

## Non-goals

- Several lists, or naming lists. The ability to create, rename and delete lists goes away.
- Languages other than English to French and English to Arabic. Add words today allows 14 languages; the app becomes English with French or Arabic only.
- A level test, placement quiz or goals at first use. First use is the language and the name, nothing more (the owner said "just pick language for now", "and also input their name").
- New stories for the new words or the advanced lists **(my call)**. The existing 40 stories stay. A list without stories simply has none.
- Accounts, a server, syncing between devices. Everything stays in the browser, as today.
- Human native-speaker review of the new content **(my call)**. It is written and checked the same way the current scenes were (see "Content"). The owner can ask for a human pass later.

## Anti-goals

- **Losing anyone's progress.** Existing learners have several lists, review history, streaks and badges. Merging into My words must keep every word's progress and every review.
- **Studying what you already know.** That's the whole point of sorting.
- **Sorting that feels like a chore.** One tap per word, fast, can stop at any time, nothing lost.
- **A sudden flood of badges or celebrations** when someone marks 150 words as known in one go.
- **A slow or broken word page** because there are now 3,500 words.
- **Wrong pictures.** As before, a wrong picture is worse than none.

## What the learner sees

### 1. First use

On first use the learner sees a short setup:

1. **Your language**: French or Arabic. This is the language translations appear in. It is not the interface language, which stays separate and keeps working as it does today. When the interface is French or Arabic, that language is preselected **(my call)**.
2. **Your name** (optional, can be skipped). It is used:
   - in a greeting ("Hi Lina, 12 words to study today");
   - in scene conversations, where it replaces "You" as the speaker's name.

   Then **Continue** leads straight to picking lists.

When it shows: the first time the learner opens any app page (My words, ready-made lists, Add words, Study, Quiz, Stories, Stats), or presses Start on the home page. The home page and a word page opened from a link work without it **(my call)**.

**Existing learners** see the same setup once. Their main language is preselected: the language most of their words are in. They are not sent to picking lists afterwards; they land where they were going **(my call)**.

Both can be changed later in one place, a "You" section on the Stats page **(my call)**. Changing the language is covered in "Changing language" below.

The name stays in the browser, is included in the backup, never goes into a link, and can be at most 30 characters **(my call)**.

### 2. Picking lists

The ready-made lists page becomes the picking screen.

- Each list shows its emoji, title, word count and a preview of its first few words, as today. Each one has a **tick box**.
- Regular lists come first. The advanced lists sit in their own group below, titled something like "Advanced" **(my call)**.
- A list that is already fully sorted shows that ("All sorted: 62 known, 38 to learn") and can't be ticked. A list that is partly sorted shows how many words are left to sort **(my call)**.
- The button at the bottom says **Continue** and counts the words: "Continue with 200 words". This replaces the old "Add list" button. Earlier the owner asked for the button to say "Add words" instead of "Add list"; picking then sorting replaces both.
- The language tabs on this page (French / Arabic) go away. The learner's language is used.

### 3. Sorting

The words of the ticked lists appear one at a time, in list order (most useful first):

- a big card with the emoji, the English word, its translation and the example sentence;
- a speaker button to hear the word;
- two big buttons, **Already know** and **Should learn**;
- a small progress line ("12 of 200");
- **Undo** for the last decision **(my call)**.

Each tap is saved straight away. The learner can stop at any time; words not yet sorted wait for next time, and the picking screen shows them as left to sort.

At the end, a short summary: how many known, how many to learn, the level, and a **Study** button.

**What counts as one word (my call):** a ready-made word is its list plus its English word. "right" in Describing words ("correct") and "right" in Place and direction ("à droite") are two different words, each sorted, studied and counted on its own. Sorting skips only words already sorted. One exception: if the learner already typed the same English word with the same translation in Add words, the ready-made word is linked to it, counts as sorted into the same part, and isn't shown again.

Keys: the two buttons have keyboard shortcuts that don't depend on left and right, so they read the same in Arabic **(my call, the builder picks the keys)**.

Sorting is not studying. It doesn't count as a review, toward the daily goal, the streak, the new-words-per-day limit, or the heatmap.

### 4. My words

The My words page is the list itself. It replaces both the page of lists and the page of one list.

- Two tabs: **Should learn** (with count) and **Already know** (with count).
- The level, shown near the top.
- Search, and filtering by ready-made list ("Food and drink", "Travel"…, plus "My own" for words typed in Add words). Tags stay as they are.
- Each word row works as today: tap for the word page, speaker, progress, edit, delete.
- A word can be moved between the two parts ("I forgot this one" → Should learn; "I know this now" → Already know).
  - **Moving to Should learn (my call):** the word comes up in Study **today**. A word that was studied before is asked again as a forgotten word. A word sorted as known and never studied starts as a new word with its first look. The move itself is not a review: it doesn't count toward the daily goal, the streak, the heatmap or the new-words-per-day limit.
  - **Moving to Already know:** the word leaves Study. Its progress is kept, so moving it back later loses nothing.
- Buttons to **pick more lists** and **add your own words**.
- Backup (download and restore) moves here, as today.

### 5. Study

- Study shows only Should learn words. Already know words never come up.
- New words still get their first look ("Got it"), then are asked a minute later. That part stays as it is; sorting happens before it.
- The new-words-per-day limit stays.
- Study can be limited to one ready-made list, replacing today's "study this list" **(my call)**.
- **Moving to Already know by itself.** A Should learn word the learner has learned well moves to Already know on its own, so the level goes up as you study. "Learned well": both directions are in long-term review, and the next review is at least 3 weeks away **(my call)**. After that it no longer comes up in Study.
- The end screen says "My words" where it said a list's name, and links to picking lists.

### 6. Add words

- No language pair picker, no swap of pairs, no "Add to" list choice, no new-list dialog. The pair is always English and the learner's language.
- The learner can still type in either English or their own language; it's a two-way switch between those two only **(my call)**. Cards are always stored English first.
- Every word added goes into **Should learn**, filed under "My own".

### 7. Quiz and stories

- Quiz takes words from My words without needing a list. By default it uses Should learn words the learner has started, and it can be limited to one ready-made list **(my call)**.
- Stories open for a ready-made list once the learner has sorted at least one of its words, known or to learn **(my call)**. The translation language is the learner's language.

### 8. Level

The learner's level is shown on My words, after sorting, on Stats, and in the greeting. It uses the familiar scale with a plain label: Starter, A1, A2, B1, B2.

How it is worked out **(my call, simple and easy to change later)**:

- Each Already know word scores 1 point if it comes from a regular list or "My own", and 2 points if it comes from an advanced list.
- The thresholds:

  | Level | Points |
  |---|---|
  | Starter | below 100 |
  | A1 | 100 |
  | A2 | 400 |
  | B1 | 1,000 |
  | B2 | 2,000 |

- Words that moved to Already know through study count the same as words sorted as known.
- The thresholds live in one place in the code.

Badges stay as they are. They count words **learned through study** only, not words sorted as known, so sorting can't award badges in bulk **(my call)**.

### Changing language

Switching language starts the new language afresh **(owner change, 2026-11-08; it replaces "each language keeps its own words")**. My words shows only the words in the learner's current language. When a learner with a profile switches, say from Arabic to French, every word in another language and every Already know mark in another language is deleted, after a confirmation that says how many words go and offers a backup first. Reviews, streak and badges stay. The first-use setup deletes nothing, since there is no previous language yet. Once a profile exists, the setup page keeps its language and the other choice is disabled, so the only way to switch is on Stats, behind that confirmation.

## Existing learners: moving to My words

This runs once, automatically, the first time the new version loads.

- All lists merge into My words. Every word keeps its card, its progress and its review history. Reviews are never rewritten or dropped.
- Every existing word becomes **Should learn**, since nobody has sorted anything yet. The learner can then move words they know.
- Each word keeps its ready-made list, so filtering by list still works. Words typed by the learner count as "My own". Each word also gets its old list's name as a tag **(my call)**, so a learner who organised words in their own lists can still find them.
- Words stored the other way round (French first) are turned to English first, keeping their progress **(my call)**. Their two schedules swap sides. The direction label on their past reviews is relabelled to match. That is a mechanical change, allowed here: no review is dropped, and no date or answer changes.
- If the same word appears twice in the same language, the one with more progress is kept. This happens, for example, when the same ready-made list was added twice. "The same word" means the same list plus the same English word, or the same English word and translation for words typed by the learner. The other's reviews stay in the history, so stats and streaks don't change.
- Words in other language pairs, such as Spanish–German, are kept in the saved data but no longer shown **(my call)**. Before any of this, the app keeps a full copy of the old data in the browser as a safety net.
- Old backups (with several lists) can still be restored, and they go through the same merge.

The old saved settings for pairs and lists go away after the move. These are `linguacards:pair`, `linguacards:decks`, `linguacards:pack-decks` and `linguacards:starter-lang`; the last one seeds the preselected language.

Old links to the list pages and to "study this list" keep working by sending the learner to My words or Study **(my call)**.

## Content: 100 words per list and advanced lists

### Words

- Each of the 20 lists grows to **100 words**.
  - The current words stay first, unchanged, so existing cards and scenes still match.
  - The new words are the next most useful everyday words on the topic for a beginner.
- About **15 advanced lists** of 100 words each, with harder, less common words. These are **(my call)**:

  | Advanced list | | |
  |---|---|---|
  | People and family | Time | Food and drink |
  | Home | Body and health | Describing words |
  | Verbs | Places in town | School and learning |
  | Work and jobs | Travel and transport | Feelings |
  | Nature and weather | Animals | Clothes |

  Greetings, numbers, questions and position have no advanced list.
- Each word has what words have today: English, French, Arabic, an optional emoji, and an English example sentence that contains the word.
- Rules **(my call)**:
  - no word twice in one list;
  - an advanced list never repeats a regular list's word;
  - a few words in two regular lists are allowed when they mean different things there ("right" in describing words and in position).
- Each list has a level: regular lists are beginner, advanced lists are advanced. The level calculation uses this.

### Word pages for the new words

Every new word gets what the current ready-made words have:

- **4 scenes** at 4 different places, each a 2–4 line conversation in English with French and Arabic translations, using the word;
- **pictures** under the existing policy: 1–3 free-licence pictures from Wikimedia Commons that clearly show the word, and none for words that can't be pictured well (function words, abstract words).

Advanced topics will need new places (a pharmacy, a court, an office meeting…), each with a label in three languages, an emoji and a picture.

How it is written and checked: the same way as the current 496 words. One writer per list, using only the list's words and earlier lists' words where possible. Then a second checker reading as a native editor of English, French and Arabic. Pictures are vetted by looking at them. The picture sheet (`docs/pictures.html`) is regenerated so the owner can look over the pictures.

### Batches

There are about 3,000 new words and about 12,000 new scenes. The owner agreed this comes in batches, list by list.

- **The app changes come first** and work with today's 25-word lists.
- Then the content ships one list at a time. A list's new words appear only when all their scenes and pictures are done.
- The existing check, that every ready-made word has a complete word page, stays strict.
- Order **(my call)**: the regular lists first, in their current order, then the advanced lists.

### Size

Today the 20 scene files total 1.4 MB. At 100 words per list they would be 8–12 MB in total, about 230–450 KB per list. The word lists themselves would grow to about 310 KB inside the app's code.

Neither may make the app or a word page noticeably slower; that's an anti-goal. How to keep them light is left to the builder (see below).

## Constraints

- Everything stays in the browser, in localStorage. Saved data must fit comfortably even for a learner who has sorted all ~3,500 words. Words sorted as Already know and never studied should be stored compactly, not as full flashcards.
- Static export on Vercel: no server, no server redirects.
- The interface is English, French and Arabic, with right-to-left Arabic. Every new piece of text needs all three, with correct Arabic plurals. English words inside Arabic text stay left to right. The learner's name may be in a different script from the interface.
- Phone width works.
- Tests, type checks, lint and build stay clean. The current tests over packs, scenes, stories and scheduling must keep passing or be updated on purpose.
- The interface language keeps working exactly as today.

## Left to the builder

- **Data shape and migration:**
  - how Should learn and Already know are stored;
  - whether lists disappear from the saved data or shrink to one hidden list;
  - versioning;
  - how two open tabs on old and new code are kept from overwriting each other.
- **Keeping things light:**
  - how word lists and scene files stay small and fast, for example splitting files, trimming picture links, or loading word lists only when needed;
  - the budget: a word page opens its scenes as fast as today.
- **Page addresses:** routes and their names, and the redirects for old links.
- **Sorting details:** the screen's exact look and keyboard shortcuts, within the behaviour above.
- **The scenes check:** any extra checks worth adding, such as "example contains the word" and "no duplicate word in a list".
- **Order of work:** the order of the app changes within the first batch.
