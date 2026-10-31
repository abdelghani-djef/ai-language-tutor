"use client";

import { CheckCircle2, Clock, RotateCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { FlipCard } from "@/components/flip-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { speak } from "@/lib/speech";
import { formatInterval, GRADES, previewIntervals, type Grade } from "@/lib/srs";
import { dueTime, endOfToday, gradeCard, isDue, useHydrated, useStore, type Flashcard } from "@/lib/store";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<number, string> = {
  1: "border-red-500/40 hover:bg-red-500/10 text-red-600 dark:text-red-400",
  2: "border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  3: "border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  4: "border-sky-500/40 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export default function StudyPageWrapper() {
  return (
    <Suspense>
      <StudyPage />
    </Suspense>
  );
}

function StudyPage() {
  const deckId = useSearchParams().get("deck");
  const hydrated = useHydrated();
  // Bumped by "Check again" to start a fresh session (e.g. after midnight).
  const [round, setRound] = useState(0);
  return hydrated ? (
    <Session
      key={`${deckId ?? "all"}:${round}`}
      deckId={deckId}
      restarted={round > 0}
      onRestart={() => setRound((r) => r + 1)}
    />
  ) : null;
}

// Learning steps due within this window keep the session open on a "Short break" screen.
const WAIT_WINDOW = 60 * 60_000;

/** In the session: available now, or a learning step that comes back within WAIT_WINDOW. */
function inSession(c: Flashcard, now: number, sessionEnd: number): boolean {
  return isDue(c, now, sessionEnd) || dueTime(c) <= now + WAIT_WINDOW;
}

function Session({
  deckId,
  restarted,
  onRestart,
}: {
  deckId: string | null;
  restarted: boolean;
  onRestart: () => void;
}) {
  const { decks, cards } = useStore();
  const deck = deckId ? decks.find((d) => d.id === deckId) : undefined;

  // Fix the set of cards for this session when it starts. Cards graded "Again"
  // come back after a short learning step, so they stay in the session.
  const [start] = useState(() => Date.now());
  const [sessionEnd] = useState(() => endOfToday(new Date(start)));
  const [sessionIds] = useState(
    () =>
      new Set(
        cards.filter((c) => (!deckId || c.deckId === deckId) && inSession(c, start, sessionEnd)).map((c) => c.id),
      ),
  );
  const [now, setNow] = useState(start);
  // The card on screen stays put until it is graded, even if another card
  // becomes due (and sorts first) while you are thinking.
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [intervals, setIntervals] = useState<Record<number, string>>({});
  const grading = useRef(false);

  const remaining = useMemo(
    () =>
      cards
        .filter((c) => sessionIds.has(c.id) && inSession(c, now, sessionEnd))
        .sort((a, b) => dueTime(a) - dueTime(b)),
    [cards, sessionIds, now, sessionEnd],
  );
  const current =
    remaining.find((c) => c.id === currentId && isDue(c, now, sessionEnd)) ??
    remaining.find((c) => isDue(c, now, sessionEnd));
  if (current && current.id !== currentId) setCurrentId(current.id);
  const nextLater = !current && remaining.length > 0 ? remaining[0] : undefined;

  // While waiting for a learning-step card, tick the clock so it appears on time.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), nextLater ? 5_000 : 30_000);
    return () => clearInterval(t);
  }, [nextLater]);

  useEffect(() => {
    if (current) previewIntervals(current.srs).then(setIntervals);
  }, [current]);

  async function grade(g: Grade) {
    if (!current || grading.current) return;
    grading.current = true;
    setFlipped(false);
    try {
      await gradeCard(current, g);
      setCurrentId(null);
      setReviewed((n) => n + 1);
      setNow(Date.now());
    } finally {
      grading.current = false;
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (e.key === " " || e.key === "Enter") {
        // Let a focused link or button (nav, pronounce, grade) activate normally.
        if (target?.closest("a, button")) return;
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) grade(g.grade);
      } else if (e.key.toLowerCase() === "p") {
        speak(current.front, current.src);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = reviewed + remaining.length;
  const title = deck ? deck.name : "All decks";

  if (!current) {
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-4 py-16 text-center">
        {nextLater ? (
          <>
            <Clock className="size-12 text-muted-foreground" />
            <h1 className="font-display text-2xl font-semibold">Short break</h1>
            <p className="text-muted-foreground" aria-live="polite">
              {remaining.length} card{remaining.length > 1 ? "s" : ""} in learning will be back in{" "}
              {formatInterval(dueTime(nextLater) - now)}. Keep this tab open, or come back later.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-12 text-emerald-500" />
            <h1 className="font-display text-2xl font-semibold">
              {reviewed > 0 ? "Done for today!" : restarted ? "Still nothing due" : "Nothing due right now"}
            </h1>
            <p className="text-muted-foreground">
              {reviewed > 0
                ? `You reviewed ${reviewed} card${reviewed > 1 ? "s" : ""} in ${title}. FSRS will bring them back right before you’re likely to forget.`
                : restarted
                  ? "Check back later, or try a quiz to practise in the meantime."
                  : "Save some new cards from the Translate page, or try a quiz to practise."}
            </p>
          </>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {!nextLater && (
            <Button variant="outline" onClick={onRestart}>
              <RotateCw /> Check again
            </Button>
          )}
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Translate
          </Link>
          {deck && (
            <Link href={`/quiz?deck=${deck.id}`} className={buttonVariants({ variant: "outline" })}>
              Quiz this deck
            </Link>
          )}
          <Link href="/stats" className={buttonVariants()}>
            See stats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Study · {title}</h1>
          <p className="text-sm text-muted-foreground">
            {remaining.length} left · {reviewed} reviewed
          </p>
        </div>
        <Progress value={total ? (reviewed / total) * 100 : 0} className="w-40" />
      </div>

      <FlipCard
        key={current.id}
        front={{ text: current.front, lang: current.src }}
        back={{ text: current.back, lang: current.tgt }}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <Button
              key={g.grade}
              variant="outline"
              className={cn("h-auto flex-col gap-0.5 py-3", GRADE_STYLE[g.grade])}
              onClick={() => grade(g.grade)}
            >
              <span className="font-semibold">{g.label}</span>
              <span className="text-xs opacity-75">{intervals[g.grade] ?? "…"}</span>
            </Button>
          ))}
        </div>
      ) : (
        <Button size="lg" className="h-14 text-base" onClick={() => setFlipped(true)}>
          Show answer
        </Button>
      )}

      <p className="sr-only" aria-live="polite">
        {flipped ? `Answer: ${current.back}` : ""}
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Space to flip · 1 Again · 2 Hard · 3 Good · 4 Easy · P to pronounce
      </p>
    </div>
  );
}
