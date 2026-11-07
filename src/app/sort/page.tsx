"use client";

import { CheckCircle2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SpeakButton } from "@/components/speak-button";
import { WordOverlay } from "@/components/word/word-overlay";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { rowOf, STARTER_PACKS, type StarterWords } from "@/data/starter-packs";
import { useLocale, useT } from "@/lib/i18n";
import { isSorted, levelOf, sortQueue } from "@/lib/mywords";
import { useStarterWords } from "@/lib/starter-words";
import { sortWord, unsortWord, useHydrated, useStore, type LearnerLang, type WordStatus } from "@/lib/store";
import type { WordTarget } from "@/lib/word/target";
import { common } from "@/messages/common";
import { levelName, sort as messages } from "@/messages/sort";

/** One decision of this session, kept for Undo and the summary at the end. */
interface Decision {
  /** Where the word is in the queue. */
  index: number;
  pack: string;
  word: string;
  choice: WordStatus;
}

interface Place {
  /** The queue index to show next (words sorted elsewhere from here on are skipped). */
  pos: number;
  /** This session's decisions, oldest first; Undo takes the last one back. */
  stack: Decision[];
  /** Queue indexes this session has decided on. They are never skipped as "sorted elsewhere". */
  touched: ReadonlySet<number>;
}

/** The lists to sort from `?lists=a,b`: known ids only, each once, in the order given. */
function parseLists(raw: string | null): string[] {
  const ids = (raw ?? "").split(",").map((s) => s.trim());
  return [...new Set(ids)].filter((id) => STARTER_PACKS.some((p) => p.id === id));
}

const kbdClass = "rounded border border-b-2 border-current/30 px-1.5 font-sans text-xs opacity-80";

export default function SortPageWrapper() {
  return (
    <Suspense>
      <SortPage />
    </Suspense>
  );
}

function SortPage() {
  const lists = parseLists(useSearchParams().get("lists"));
  const hydrated = useHydrated();
  const { profile } = useStore();
  // The setup gate makes sure there is a profile on this page.
  const lang: LearnerLang = profile?.lang ?? "fr";
  // The lists' words: the session's queue is made from them.
  const words = useStarterWords();
  if (!hydrated || !words) return null;
  // A new language or new lists start a new session with its own queue.
  return <Session key={`${lang}:${lists.join(",")}`} lists={lists} lang={lang} words={words} />;
}

function Session({ lists, lang, words }: { lists: string[]; lang: LearnerLang; words: StarterWords }) {
  const data = useStore();
  const t = useT(messages);
  const tc = useT(common);
  const [locale] = useLocale();
  // Fixed when the session starts, so the order doesn't shift as words are sorted.
  const [queue] = useState(() => sortQueue(data, lists, words));
  const [place, setPlace] = useState<Place>(() => ({ pos: 0, stack: [], touched: new Set() }));

  // Skip words sorted since the queue was made (say, in another tab).
  let index = place.pos;
  while (
    index < queue.length &&
    !place.touched.has(index) &&
    isSorted(data, queue[index].pack, queue[index].word, words)
  ) {
    index += 1;
  }
  const item = queue[index];
  const row = item && rowOf(words, item.pack, item.word);
  const done = !item || !row;
  // The word page, opened over the session so the session and its Undo stay as they are.
  const [wordPage, setWordPage] = useState<WordTarget | null>(null);
  // The queue index last decided on: a second key press before the next render doesn't decide it twice.
  const decided = useRef(-1);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  // When the screen changes, focus goes to the new one instead of falling to the page:
  // the summary's title after the last word, the first choice after Undo brings a word back.
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) titleRef.current?.focus();
    else if (!done && wasDone.current) firstChoiceRef.current?.focus();
    wasDone.current = done;
  }, [done]);

  const wordNode = (word: string) => (
    <bdi lang="en" dir="ltr">
      {word}
    </bdi>
  );

  function decide(choice: WordStatus) {
    if (!item || decided.current === index) return;
    decided.current = index;
    const d: Decision = { index, pack: item.pack, word: item.word, choice };
    // On to the next word straight away; the save happens in the background.
    setPlace((p) => ({ pos: index + 1, stack: [...p.stack, d], touched: new Set(p.touched).add(index) }));
    sortWord(d.pack, d.word, choice).catch(() => {
      // Nothing was saved, so there is nothing to undo. The learner stays where they are.
      toast.error(t.rich("sortFailed", { word: wordNode(d.word) }));
      setPlace((p) => ({ ...p, stack: p.stack.filter((x) => x !== d) }));
    });
  }

  function undo() {
    const d = place.stack.at(-1);
    if (!d) return;
    decided.current = -1;
    setPlace((p) => (p.stack.at(-1) === d ? { ...p, pos: d.index, stack: p.stack.slice(0, -1) } : p));
    unsortWord(d.pack, d.word).catch(() => {
      toast.error(t.rich("undoFailed", { word: wordNode(d.word) }));
      // The word is still sorted: put the decision back, unless the learner has moved on since.
      setPlace((p) =>
        p.pos === d.index && !p.stack.includes(d) ? { ...p, pos: d.index + 1, stack: [...p.stack, d] } : p,
      );
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Shift is allowed: on a French keyboard it is how the 1 and 2 keys type digits.
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      // Physical keys (the number pad too), so they work on any keyboard layout and in either direction.
      const choice =
        e.code === "Digit1" || e.code === "Numpad1"
          ? "known"
          : e.code === "Digit2" || e.code === "Numpad2"
            ? "learn"
            : null;
      if (!choice || !item) return;
      e.preventDefault();
      decide(choice);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const undoButton = (
    <Button variant="ghost" onClick={undo} disabled={place.stack.length === 0}>
      <Undo2 className="rtl:-scale-x-100" aria-hidden /> {t("undo")}
    </Button>
  );

  if (done) {
    // Nothing to sort: no lists, all sorted already, or everything left was sorted elsewhere.
    if (place.stack.length === 0) {
      return (
        <div className="mx-auto grid max-w-md justify-items-center gap-4 py-16 text-center">
          <h1 ref={titleRef} tabIndex={-1} className="text-lg font-normal outline-none">
            {t("nothingLeft")}
          </h1>
          <Link href="/words/" className={buttonVariants({ size: "lg" })}>
            {t("pickMore")}
          </Link>
        </div>
      );
    }
    const known = place.stack.filter((d) => d.choice === "known").length;
    const learn = place.stack.length - known;
    const level = levelOf(data, words).id;
    // A1–B2 are Latin codes: their own left-to-right run inside Arabic text.
    const levelNode: ReactNode = level === "starter" ? t(levelName[level]) : <bdi dir="ltr">{t(levelName[level])}</bdi>;
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-4 py-12 text-center">
        <CheckCircle2 className="size-12 text-emerald-500" aria-hidden />
        <h1 ref={titleRef} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">
          {t("doneTitle")}
        </h1>
        <ul className="grid gap-1 text-muted-foreground">
          <li>{t("doneKnown", { count: known })}</li>
          <li>{t("doneLearn", { count: learn })}</li>
        </ul>
        <p className="text-lg font-medium">{t.rich("yourLevel", { level: levelNode })}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/study/" className={buttonVariants({ size: "lg" })}>
            {t("study")}
          </Link>
          <Link href="/words/" className={buttonVariants({ size: "lg", variant: "outline" })}>
            {t("pickMore")}
          </Link>
        </div>
        {undoButton}
      </div>
    );
  }

  const [english, french, arabic, emoji, example] = row;
  const translation = lang === "fr" ? french : arabic;
  const pack = STARTER_PACKS.find((p) => p.id === item.pack);
  const total = queue.length;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
          {undoButton}
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="truncate">
            {pack && (
              <>
                <span aria-hidden>{pack.emoji}</span> {pack.title[locale]}
              </>
            )}
          </span>
          <span className="shrink-0">{t("progress", { n: index + 1, total })}</span>
        </div>
        <Progress value={(index / total) * 100} aria-label={t("progressLabel")} />
      </div>

      <div className="grid justify-items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        {emoji && (
          <span className="text-6xl leading-none" aria-hidden>
            {emoji}
          </span>
        )}
        <div className="flex max-w-full items-center justify-center gap-1">
          <p className="min-w-0 font-display text-4xl font-semibold break-words">
            <bdi lang="en" dir="ltr">
              <button
                type="button"
                onClick={() => setWordPage({ word: english, lang: "en", to: lang, pack: item.pack })}
                className="cursor-pointer rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {english}
              </button>
            </bdi>
          </p>
          <SpeakButton text={english} lang="en" label={tc("pronounceWord", { word: english })} />
        </div>
        <p lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="text-xl break-words">
          {translation}
        </p>
        {example && (
          <p lang="en" dir="ltr" className="text-muted-foreground break-words">
            {example}
          </p>
        )}
      </div>

      {/* Already know, then Should learn, in the page's own direction. */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          ref={firstChoiceRef}
          variant="outline"
          size="lg"
          aria-keyshortcuts="1"
          className="h-14 px-3 text-base leading-tight whitespace-normal"
          onClick={() => decide("known")}
        >
          <kbd className={kbdClass} aria-hidden>
            1
          </kbd>
          {t("alreadyKnow")}
        </Button>
        <Button
          size="lg"
          aria-keyshortcuts="2"
          className="h-14 px-3 text-base leading-tight whitespace-normal"
          onClick={() => decide("learn")}
        >
          <kbd className={kbdClass} aria-hidden>
            2
          </kbd>
          {t("shouldLearn")}
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        <span lang="en">{english}</span>, <span lang={lang}>{translation}</span>
      </p>

      <WordOverlay target={wordPage} onClose={() => setWordPage(null)} />
    </div>
  );
}
