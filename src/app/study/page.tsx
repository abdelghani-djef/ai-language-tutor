"use client";

import { BookOpen, CheckCircle2, Clock, RotateCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { FlipCard } from "@/components/flip-card";
import { PlanCard } from "@/components/plan-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { choicesFor, distinctCount, normalizeAnswer } from "@/lib/quiz";
import { speak } from "@/lib/speech";
import { previewIntervals, Rating, State, type Grade } from "@/lib/srs";
import {
  dueTime,
  endOfToday,
  gradeCard,
  hasTag,
  isDue,
  itemsOf,
  newStartedOn,
  newWords,
  startedItems,
  useHydrated,
  usePref,
  useStore,
  useToday,
  type Flashcard,
  type StudyItem,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { STARTER_STORIES } from "@/data/starter-stories";
import { rankStories, todaysCards } from "@/lib/story";
import { story } from "@/messages/story";
import { study } from "@/messages/study";

const GRADE_STYLE: Record<number, string> = {
  1: "border-red-500/40 hover:bg-red-500/10 text-red-600 dark:text-red-400",
  2: "border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  3: "border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  4: "border-sky-500/40 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

// Learning steps due within this window keep the session open on a "Short break" screen.
const WAIT_WINDOW = 60 * 60_000;
// How you answer: think of the word and tap to check it (recalling in your head
// works about as well as typing it; Smith, Roediger & Karpicke 2013), or pick it
// from four options, graded for you.
type Mode = "think" | "pick";
const MODE_KEY = "linguacards:study-mode";

// After you check, one tap says how it went.
const RATINGS = [
  { grade: Rating.Again, labelKey: "forgot", codes: ["Digit1", "Numpad1"] },
  { grade: Rating.Hard, labelKey: "almost", codes: ["Digit2", "Numpad2"] },
  { grade: Rating.Good, labelKey: "knewIt", codes: ["Digit3", "Numpad3"] },
] as const;

export default function StudyPageWrapper() {
  return (
    <Suspense>
      <StudyPage />
    </Suspense>
  );
}

function StudyPage() {
  const params = useSearchParams();
  const deckId = params.get("deck");
  const tag = params.get("tag");
  const hydrated = useHydrated();
  // Bumped by "Check again" to start a fresh session (e.g. after midnight).
  const [round, setRound] = useState(0);
  return hydrated ? (
    <Session
      key={`${deckId ?? "all"}:${tag ?? ""}:${round}`}
      deckId={deckId}
      tag={tag}
      restarted={round > 0}
      onRestart={() => setRound((r) => r + 1)}
    />
  ) : null;
}

/** In the session: available now, or a learning step that comes back within WAIT_WINDOW. */
function inSession(item: StudyItem, now: number, sessionEnd: number): boolean {
  return isDue(item, now, sessionEnd) || dueTime(item) <= now + WAIT_WINDOW;
}

/** The side asked and the side to recall for a card asked one way. */
function sidesOf(card: Flashcard, dir: StudyItem["dir"]) {
  return dir === "forward"
    ? { prompt: { text: card.front, lang: card.src }, answer: { text: card.back, lang: card.tgt } }
    : { prompt: { text: card.back, lang: card.tgt }, answer: { text: card.front, lang: card.src } };
}

const sides = (item: StudyItem) => sidesOf(item.card, item.dir);

type Phase =
  | { kind: "intro" }
  | { kind: "ask"; choices: string[] | null }
  | { kind: "revealed"; picked: string | null; right: boolean };

function Session({
  deckId,
  tag,
  restarted,
  onRestart,
}: {
  deckId: string | null;
  tag: string | null;
  restarted: boolean;
  onRestart: () => void;
}) {
  const data = useStore();
  const { decks, cards, reviews, settings } = data;
  const deck = deckId ? decks.find((d) => d.id === deckId) : undefined;
  const today = useToday();
  const fmt = useFormat();
  const t = useT(study);
  const ts = useT(story);

  // Fix the session's items and their order when it starts: due reviews, with
  // the new words today's limit allows mixed in (one after every two reviews),
  // so new and old practice interleave instead of coming in blocks.
  const [start] = useState(() => Date.now());
  const [sessionEnd] = useState(() => endOfToday(new Date(start)));
  const [order] = useState(() => {
    const inScope = cards.filter((c) => hasTag(c, tag));
    // Started items due today, or a learning step coming back within the wait window.
    const due = startedItems(inScope, deckId, (i) => inSession(i, start, sessionEnd));
    const left = Math.max(0, settings.newPerDay - newStartedOn(reviews, today));
    const fresh = newWords(inScope, deckId).slice(0, left).map((c) => itemsOf(c)[0]);
    const merged: string[] = [];
    while (due.length || fresh.length) {
      merged.push(...due.splice(0, 2).map((i) => i.key));
      if (fresh.length) merged.push(fresh.shift()!.key);
    }
    return merged;
  });
  const [now, setNow] = useState(start);
  // The item on screen stays put until it is graded, even if another becomes due meanwhile.
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [modePref, setModePref] = usePref(MODE_KEY, "think");
  const mode: Mode = modePref === "pick" ? "pick" : "think";
  const [phase, setPhase] = useState<Phase>({ kind: "ask", choices: null });
  const [reviewed, setReviewed] = useState(0);
  const [intervals, setIntervals] = useState<Record<number, number>>({});
  const grading = useRef(false);
  const actionRef = useRef<HTMLButtonElement>(null);

  const byKey = useMemo(() => new Map(cards.flatMap(itemsOf).map((i) => [i.key, i])), [cards]);
  const remaining = useMemo(
    () => order.map((k) => byKey.get(k)).filter((i): i is StudyItem => !!i && inSession(i, now, sessionEnd)),
    [order, byKey, now, sessionEnd],
  );
  const current =
    remaining.find((i) => i.key === currentKey && isDue(i, now, sessionEnd)) ??
    remaining.find((i) => isDue(i, now, sessionEnd));
  const nextLater = !current && remaining.length > 0 ? [...remaining].sort((a, b) => dueTime(a) - dueTime(b))[0] : undefined;

  // A new item on screen starts in its first phase.
  if (current && current.key !== currentKey) {
    setCurrentKey(current.key);
    setPhase(firstPhase(current, mode));
  }

  function firstPhase(item: StudyItem, m: Mode): Phase {
    // You can't recall a word you have never seen: a new word is shown first.
    if (item.dir === "forward" && item.srs.state === State.New && !item.card.introducedAt) return { kind: "intro" };
    // Picking needs four different answers; with fewer, think and check instead.
    return { kind: "ask", choices: m === "pick" ? choicesForItem(item) : null };
  }

  function changeMode(m: Mode) {
    setModePref(m);
    if (current && phase.kind === "ask") setPhase(firstPhase(current, m));
  }

  /** Cards asked with the same prompt the same way: "bonjour" can be "hello" or "good morning". */
  function samePrompt(item: StudyItem): Flashcard[] {
    const key = normalizeAnswer(sides(item).prompt.text);
    return cards.filter(
      (c) =>
        c.src === item.card.src &&
        c.tgt === item.card.tgt &&
        (c.id === item.card.id || normalizeAnswer(sidesOf(c, item.dir).prompt.text) === key),
    );
  }

  /** Four options from other cards asked the same way, or null if there aren't enough. */
  function choicesForItem(item: StudyItem): string[] | null {
    const answer = sides(item).answer.text;
    // Cards with the same prompt are right answers too, so they can't be distractors.
    const same = new Set(samePrompt(item).map((c) => c.id));
    const pool = cards
      .filter((c) => !same.has(c.id) && c.src === item.card.src && c.tgt === item.card.tgt)
      .map((c) => sidesOf(c, item.dir).answer.text);
    return distinctCount([answer, ...pool]) >= 4 ? choicesFor(answer, pool) : null;
  }

  // While waiting for a learning-step item, tick the clock so it appears on time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), nextLater ? 5_000 : 30_000);
    return () => clearInterval(id);
  }, [nextLater]);

  useEffect(() => {
    if (current) previewIntervals(current.srs).then(setIntervals);
  }, [current]);

  // Keep the next action under the keyboard: "Show answer", then "Next" after a pick.
  useEffect(() => {
    actionRef.current?.focus();
  }, [phase, currentKey]);

  async function grade(g: Grade, { intro = false } = {}) {
    if (!current || grading.current) return;
    grading.current = true;
    try {
      await gradeCard(current.card, g, current.dir, { intro });
      setCurrentKey(null);
      if (!intro) setReviewed((n) => n + 1);
      setNow(Date.now());
    } finally {
      grading.current = false;
    }
  }

  function pick(choice: string) {
    if (!current) return;
    setPhase({ kind: "revealed", picked: choice, right: choice === sides(current).answer.text });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      // Physical keys, so 1–3 and P work on any keyboard layout (Arabic included).
      const rating = RATINGS.find((r) => (r.codes as readonly string[]).includes(e.code));
      if (phase.kind === "revealed" && phase.picked === null && rating) {
        grade(rating.grade);
      } else if (e.code === "KeyP") {
        const { prompt, answer } = sides(current);
        const side = phase.kind === "revealed" ? answer : prompt;
        speak(side.text, side.lang);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = reviewed + remaining.length;
  // A story to read at the end of the lesson, if one uses the words just studied.
  const storyReady =
    !current &&
    (rankStories(STARTER_STORIES, new Set(cards.map((c) => c.pack).filter((p): p is string => !!p)), todaysCards(cards, reviews, today, deckId))[0]
      ?.used ?? 0) > 0;
  const title = `${deck ? deck.name : t("allDecks")}${tag ? ` · ${fmt.tag(tag)}` : ""}`;

  if (!current) {
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-4 py-16 text-center">
        {nextLater ? (
          <>
            <Clock className="size-12 text-muted-foreground" />
            <h1 className="font-display text-2xl font-semibold">{t("breakTitle")}</h1>
            <p className="text-muted-foreground" aria-live="polite">
              {t("breakText", { count: remaining.length, time: fmt.interval(dueTime(nextLater) - now) })}
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-12 text-emerald-500" />
            <h1 className="font-display text-2xl font-semibold">
              {reviewed > 0 ? t("doneTitle") : restarted ? t("stillNothingTitle") : t("nothingTitle")}
            </h1>
            <p className="text-muted-foreground">
              {reviewed > 0
                ? t("doneText", { count: reviewed, title })
                : restarted
                  ? t("stillNothingText")
                  : t("nothingText")}
            </p>
          </>
        )}
        {!nextLater && reviewed > 0 && storyReady && (
          // The end of a lesson: read the words just practised in a story (more input, same words).
          <Link href={deck ? `/story?deck=${deck.id}` : "/story"} className={buttonVariants({ size: "lg" })}>
            <BookOpen /> {ts("readStory")}
          </Link>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {!nextLater && (
            <Button variant="outline" onClick={onRestart}>
              <RotateCw /> {t("checkAgain")}
            </Button>
          )}
          <Link href="/words" className={buttonVariants({ variant: "outline" })}>
            {t("starterWords")}
          </Link>
          {deck && (
            <Link href={`/quiz?deck=${deck.id}`} className={buttonVariants({ variant: "outline" })}>
              {t("quizDeck")}
            </Link>
          )}
          <Link href="/stats" className={buttonVariants()}>
            {t("seeStats")}
          </Link>
        </div>
        {!nextLater && reviewed > 0 && <PlanCard className="mt-4 w-full text-start" />}
      </div>
    );
  }


  const { prompt, answer } = sides(current);
  const answerDir = LANGUAGES[answer.lang].rtl ? "rtl" : "auto";
  const revealed = phase.kind !== "ask";

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t("sessionTitle", { title })}</h1>
          <p className="text-sm text-muted-foreground">
            {t("left", { count: remaining.length })} · {t("reviewed", { count: reviewed })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={mode} onValueChange={(v) => changeMode(v === "pick" ? "pick" : "think")}>
            <TabsList aria-label={t("modeLabel")}>
              <TabsTrigger value="think">{t("modeThink")}</TabsTrigger>
              <TabsTrigger value="pick">{t("modePick")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Progress value={total ? (reviewed / total) * 100 : 0} className="hidden w-32 sm:block" />
        </div>
      </div>

      <div className="grid gap-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {phase.kind === "intro" ? (
            <>
              <Sparkles className="size-4 text-primary" aria-hidden /> {t("newWord")}
            </>
          ) : (
            t("recallIn", { lang: fmt.languageNameInline(answer.lang) })
          )}
        </p>
        <FlipCard
          key={current.key}
          front={prompt}
          back={answer}
          extras={{
            example: current.card.example,
            // Examples are written in the target language unless the card says otherwise.
            exampleLang: current.card.exampleLang ?? current.card.tgt,
            notes: current.card.notes,
            image: current.card.image,
            emoji: current.card.emoji,
            echoFront: true,
          }}
          flipped={revealed}
          // Tapping the card checks the answer, like the button (not while choosing).
          onFlip={() => {
            if (phase.kind === "ask" && !phase.choices) setPhase({ kind: "revealed", picked: null, right: false });
          }}
        />
      </div>

      {phase.kind === "intro" && (
        <div className="grid gap-2">
          <p className="text-center text-sm text-muted-foreground">{t("introHint")}</p>
          <Button ref={actionRef} size="lg" className="h-14 text-base" onClick={() => grade(Rating.Again, { intro: true })}>
            {t("gotIt")}
          </Button>
        </div>
      )}

      {phase.kind === "ask" &&
        (phase.choices ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {phase.choices.map((c, i) => (
              <Button
                key={c}
                ref={i === 0 ? actionRef : undefined}
                variant="outline"
                dir={answerDir}
                lang={answer.lang}
                className="h-auto min-h-14 justify-start py-3 text-start text-lg whitespace-normal"
                onClick={() => pick(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            <p className="text-center text-sm text-muted-foreground">{t("thinkHint")}</p>
            <Button
              ref={actionRef}
              size="lg"
              className="h-14 text-base"
              onClick={() => setPhase({ kind: "revealed", picked: null, right: false })}
            >
              {t("showAnswer")}
            </Button>
          </div>
        ))}

      {phase.kind === "revealed" &&
        (phase.picked !== null ? (
          // A pick is graded for you: right counts as remembered, wrong as forgotten.
          <div className="grid gap-3">
            <p
              className={cn(
                "rounded-xl border p-4 text-center font-medium",
                phase.right ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5",
              )}
            >
              {phase.right ? t("correct") : t("wrongPick", { answer: answer.text })}
            </p>
            <Button
              ref={actionRef}
              size="lg"
              className="h-14 text-base"
              onClick={() => grade(phase.right ? Rating.Good : Rating.Again)}
            >
              {t("next")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <p className="text-center text-sm text-muted-foreground">{t("howDidItGo")}</p>
            <div className="grid grid-cols-3 gap-2">
              {RATINGS.map((r) => (
                <Button
                  key={r.grade}
                  variant="outline"
                  className={cn("h-auto min-h-16 flex-col gap-0.5 py-3 text-base", GRADE_STYLE[r.grade])}
                  onClick={() => grade(r.grade)}
                >
                  <span className="font-semibold">{t(r.labelKey)}</span>
                  <span className="text-xs opacity-75">
                    {intervals[r.grade] === undefined ? "…" : fmt.interval(intervals[r.grade])}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        ))}

      <p className="sr-only" aria-live="polite">
        {phase.kind === "revealed"
          ? `${phase.picked !== null ? (phase.right ? t("correct") : t("wrongPick", { answer: answer.text })) : ""} ${t("answer", { back: answer.text })}`
          : phase.kind === "intro"
            ? `${t("newWord")}: ${prompt.text}, ${answer.text}`
            : prompt.text}
      </p>

      <p className="text-center text-xs text-muted-foreground">{t(mode === "pick" ? "keyHintPick" : "keyHint")}</p>
    </div>
  );
}
