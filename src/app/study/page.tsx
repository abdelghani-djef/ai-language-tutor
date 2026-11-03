"use client";

import { CheckCircle2, Clock, RotateCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FlipCard } from "@/components/flip-card";
import { PlanCard } from "@/components/plan-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import {
  acceptedAnswers,
  answerDiff,
  checkAnswer,
  choicesFor,
  closestAnswer,
  distinctCount,
  normalizeAnswer,
  type Verdict,
} from "@/lib/quiz";
import { speak } from "@/lib/speech";
import { GRADES, previewIntervals, Rating, State, type Grade } from "@/lib/srs";
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
  useStore,
  useToday,
  type Flashcard,
  type StudyItem,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { study } from "@/messages/study";

const GRADE_STYLE: Record<number, string> = {
  1: "border-red-500/40 hover:bg-red-500/10 text-red-600 dark:text-red-400",
  2: "border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  3: "border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  4: "border-sky-500/40 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

// Learning steps due within this window keep the session open on a "Short break" screen.
const WAIT_WINDOW = 60 * 60_000;
// An item forgotten this often and being relearned right now is asked as multiple
// choice: easier, but still a recall. Once it's recalled again it goes back to typing.
const STRUGGLING_LAPSES = 2;

// Grades by physical key, so 1–4 and P work on any keyboard layout (Arabic included).
const GRADE_CODES: Record<string, Grade> = {
  Digit1: Rating.Again,
  Numpad1: Rating.Again,
  Digit2: Rating.Hard,
  Numpad2: Rating.Hard,
  Digit3: Rating.Good,
  Numpad3: Rating.Good,
  Digit4: Rating.Easy,
  Numpad4: Rating.Easy,
};

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
  | { kind: "answer"; choices: string[] | null }
  | { kind: "feedback"; verdict: Verdict | "skipped"; given: string; target: string; suggested: Grade };

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
  const [phase, setPhase] = useState<Phase>({ kind: "answer", choices: null });
  const [typed, setTyped] = useState("");
  const [reviewed, setReviewed] = useState(0);
  const [intervals, setIntervals] = useState<Record<number, number>>({});
  const grading = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestedRef = useRef<HTMLButtonElement>(null);

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
    setTyped("");
    setPhase(firstPhase(current));
  }

  function firstPhase(item: StudyItem): Phase {
    // You can't recall a word you have never seen: a new word is shown first.
    if (item.dir === "forward" && item.srs.state === State.New && !item.card.introducedAt) return { kind: "intro" };
    const struggling = item.srs.state === State.Relearning && item.srs.lapses >= STRUGGLING_LAPSES;
    return { kind: "answer", choices: struggling ? choicesForItem(item) : null };
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

  useEffect(() => {
    if (phase.kind === "answer" && !phase.choices) inputRef.current?.focus();
    if (phase.kind === "feedback") suggestedRef.current?.focus();
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

  function check(given: string, viaChoice = false) {
    if (!current) return;
    // Other cards asked with the same prompt count too, whether or not they're asked this way yet.
    const accepted = samePrompt(current).flatMap((c) => acceptedAnswers(sidesOf(c, current.dir).answer.text));
    const verdict = checkAnswer(given, accepted);
    // Show the spelling to fix against the accepted form closest to what was typed.
    const target = given ? closestAnswer(given, accepted) : sides(current).answer.text;
    // The grade follows what you actually recalled. Picking from options is easier
    // than producing the word, so a right pick counts as "Hard", not "Good".
    const suggested: Grade =
      verdict === "wrong" ? Rating.Again : verdict === "close" || viaChoice ? Rating.Hard : Rating.Good;
    setPhase({ kind: "feedback", verdict, given, target, suggested });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (typed.trim()) check(typed);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (phase.kind === "feedback" && GRADE_CODES[e.code]) {
        grade(GRADE_CODES[e.code]);
      } else if (e.code === "KeyP") {
        // In feedback, hear the answer; otherwise the word being asked.
        const { prompt, answer } = sides(current);
        const side = phase.kind === "answer" ? prompt : answer;
        speak(side.text, side.lang);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = reviewed + remaining.length;
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
  const revealed = phase.kind !== "answer";

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t("sessionTitle", { title })}</h1>
          <p className="text-sm text-muted-foreground">
            {t("left", { count: remaining.length })} · {t("reviewed", { count: reviewed })}
          </p>
        </div>
        <Progress value={total ? (reviewed / total) * 100 : 0} className="w-40" />
      </div>

      <div className="grid gap-2">
        {/* The word being asked, for screen readers: focus goes straight to the answer field. */}
        <span id="recall-prompt" className="sr-only" lang={prompt.lang}>
          {prompt.text}
        </span>
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
          // Turning the card over by hand would skip the recall, so only the buttons reveal it.
          onFlip={() => {}}
        />
      </div>

      {phase.kind === "intro" && (
        <div className="grid gap-2">
          <p className="text-center text-sm text-muted-foreground">{t("introHint")}</p>
          <Button size="lg" className="h-14 text-base" autoFocus onClick={() => grade(Rating.Again, { intro: true })}>
            {t("gotIt")}
          </Button>
        </div>
      )}

      {phase.kind === "answer" &&
        (phase.choices ? (
          <div className="grid gap-2">
          <div role="group" aria-describedby="recall-prompt" className="grid gap-2 sm:grid-cols-2">
            {phase.choices.map((c, i) => (
              <Button
                key={c}
                variant="outline"
                dir={answerDir}
                lang={answer.lang}
                autoFocus={i === 0}
                className="h-auto justify-start py-3 text-start text-base whitespace-normal"
                onClick={() => check(c, true)}
              >
                {c}
              </Button>
            ))}
          </div>
          <div className="flex justify-center">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPhase({ kind: "answer", choices: null })}>
              {t("typeInstead")}
            </Button>
          </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                dir={typed ? answerDir : undefined}
                lang={typed ? answer.lang : undefined}
                aria-label={t("typeAnswer", { lang: fmt.languageNameInline(answer.lang) })}
                aria-describedby="recall-prompt"
                placeholder={t("typeAnswer", { lang: fmt.languageNameInline(answer.lang) })}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <Button type="submit" size="lg" className="h-12" disabled={!typed.trim()}>
                {t("check")}
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPhase({ kind: "feedback", verdict: "skipped", given: "", target: answer.text, suggested: Rating.Again })
                }
              >
                {t("dontKnow")}
              </Button>
              {choicesForItem(current) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase({ kind: "answer", choices: choicesForItem(current) })}
                >
                  {t("showChoices")}
                </Button>
              )}
            </div>
          </form>
        ))}

      {phase.kind === "feedback" && (
        <div className="grid gap-4">
          <Feedback verdict={phase.verdict} given={phase.given} answer={phase.target} answerDir={answerDir} />
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => {
              const suggested = g.grade === phase.suggested;
              return (
                <Button
                  key={g.grade}
                  ref={suggested ? suggestedRef : undefined}
                  variant="outline"
                  aria-describedby={suggested ? "suggested-grade" : undefined}
                  className={cn(
                    "h-auto flex-col gap-0.5 py-3",
                    GRADE_STYLE[g.grade],
                    suggested && "ring-3 ring-current/30",
                  )}
                  onClick={() => grade(g.grade)}
                >
                  <span className="font-semibold">{t(g.labelKey)}</span>
                  <span className="text-xs opacity-75">
                    {intervals[g.grade] === undefined ? "…" : fmt.interval(intervals[g.grade])}
                  </span>
                </Button>
              );
            })}
          </div>
          <p id="suggested-grade" className="text-center text-xs text-muted-foreground">
            {t("suggestedHint", { grade: t(GRADES.find((g) => g.grade === phase.suggested)!.labelKey) })}
          </p>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {phase.kind === "feedback"
          ? `${t(VERDICT_KEY[phase.verdict])} ${t("answer", { back: answer.text })}`
          : phase.kind === "intro"
            ? `${t("newWord")}: ${prompt.text}, ${answer.text}`
            : ""}
      </p>

      <p className="text-center text-xs text-muted-foreground">{t("keyHint")}</p>
    </div>
  );
}

const VERDICT_KEY = { correct: "correct", close: "close", wrong: "wrong", skipped: "skipped" } as const;

/** What you got right or wrong: the verdict, and your answer against the right one. */
function Feedback({
  verdict,
  given,
  answer,
  answerDir,
}: {
  verdict: Verdict | "skipped";
  given: string;
  answer: string;
  answerDir: "rtl" | "auto";
}) {
  const t = useT(study);
  const good = verdict === "correct" || verdict === "close";
  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border p-4",
        good ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5",
      )}
    >
      <p className="font-medium">{t(VERDICT_KEY[verdict])}</p>
      {given && verdict !== "correct" && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("youWrote")} </span>
          <span dir={answerDir} className="font-medium">
            {answerDiff(given, answer).map((p, i) =>
              p.kind === "same" ? (
                <span key={i}>{p.text}</span>
              ) : p.kind === "missing" ? (
                <ins key={i} className="bg-emerald-500/20 text-emerald-700 no-underline dark:text-emerald-300">
                  {p.text}
                </ins>
              ) : (
                <del key={i} className="bg-red-500/15 text-red-700 dark:text-red-300">
                  {p.text}
                </del>
              ),
            )}
          </span>
        </p>
      )}
    </div>
  );
}
