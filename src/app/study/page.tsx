"use client";

import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FlipCard } from "@/components/flip-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { speak } from "@/lib/speech";
import { formatInterval, GRADES, previewIntervals, type Grade } from "@/lib/srs";
import { dueTime, dueToday, endOfToday, gradeCard, useHydrated, useStore } from "@/lib/store";
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
  return hydrated ? <Session key={deckId ?? "all"} deckId={deckId} /> : null;
}

function Session({ deckId }: { deckId: string | null }) {
  const { decks, cards } = useStore();
  const deck = deckId ? decks.find((d) => d.id === deckId) : undefined;

  // Fix the set of cards for this session when it starts. Cards graded "Again"
  // come back later today (FSRS learning steps), so they stay in the session.
  const [sessionIds] = useState(() => new Set(dueToday(cards, deckId).map((c) => c.id)));
  const [now, setNow] = useState(() => Date.now());
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [intervals, setIntervals] = useState<Record<number, string>>({});

  const remaining = useMemo(
    () =>
      cards
        .filter((c) => sessionIds.has(c.id) && dueTime(c) <= endOfToday())
        .sort((a, b) => dueTime(a) - dueTime(b)),
    [cards, sessionIds],
  );
  const current = remaining.find((c) => dueTime(c) <= now);
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
    if (!current) return;
    await gradeCard(current, g);
    setReviewed((n) => n + 1);
    setFlipped(false);
    setNow(Date.now());
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " || e.key === "Enter") {
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
            <p className="text-muted-foreground">
              {remaining.length} card{remaining.length > 1 ? "s" : ""} in learning will be back in{" "}
              {formatInterval(dueTime(nextLater) - now)}. Keep this tab open, or come back later.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-12 text-emerald-500" />
            <h1 className="font-display text-2xl font-semibold">
              {reviewed > 0 ? "Done for today!" : "Nothing due right now"}
            </h1>
            <p className="text-muted-foreground">
              {reviewed > 0
                ? `You reviewed ${reviewed} card${reviewed > 1 ? "s" : ""} in ${title}. FSRS will bring them back right before you’re likely to forget.`
                : "Save some new cards from the Translate page, or try a quiz to practise."}
            </p>
          </>
        )}
        <div className="flex gap-2">
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

      <p className="text-center text-xs text-muted-foreground">
        Space to flip · 1 Again · 2 Hard · 3 Good · 4 Easy · P to pronounce
      </p>
    </div>
  );
}
