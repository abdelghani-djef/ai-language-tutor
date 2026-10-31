"use client";

import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { SpeakButton } from "@/components/speak-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANGUAGES } from "@/lib/languages";
import { checkAnswer, choicesFor, shuffle, type Verdict } from "@/lib/quiz";
import { useHydrated, useStore, type Flashcard } from "@/lib/store";
import { cn } from "@/lib/utils";

type Mode = "type" | "choice";
type Direction = "forward" | "reverse";

interface Question {
  card: Flashcard;
  prompt: string;
  promptLang: string;
  answer: string;
  answerLang: string;
  choices: string[];
}

const QUIZ_LENGTH = 10;

export default function QuizPageWrapper() {
  return (
    <Suspense>
      <QuizPage />
    </Suspense>
  );
}

function QuizPage() {
  const deckId = useSearchParams().get("deck");
  const hydrated = useHydrated();
  const { decks, cards } = useStore();
  const [mode, setMode] = useState<Mode>("type");
  const [direction, setDirection] = useState<Direction>("forward");
  const [round, setRound] = useState(0);

  if (!hydrated) return null;
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) {
    return (
      <div className="grid justify-items-start gap-3">
        <p>Pick a deck to quiz yourself on.</p>
        <Link href="/decks" className={buttonVariants({ variant: "outline" })}>
          Go to decks
        </Link>
      </div>
    );
  }
  const deckCards = cards.filter((c) => c.deckId === deck.id);
  const canChoose = deckCards.length >= 4;
  const effectiveMode = canChoose ? mode : "type";

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Quiz · {deck.name}</h1>
          <p className="text-sm text-muted-foreground">Practice only — quizzes don’t change your review schedule.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={effectiveMode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="type">Type answer</TabsTrigger>
              <TabsTrigger value="choice" disabled={!canChoose} title={canChoose ? undefined : "Needs at least 4 cards"}>
                Multiple choice
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <TabsList>
              <TabsTrigger value="forward">
                {deck.src.toUpperCase()} → {deck.tgt.toUpperCase()}
              </TabsTrigger>
              <TabsTrigger value="reverse">
                {deck.tgt.toUpperCase()} → {deck.src.toUpperCase()}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {deckCards.length === 0 ? (
        <p className="text-muted-foreground">This deck has no cards yet.</p>
      ) : (
        <QuizRun
          key={`${effectiveMode}-${direction}-${round}`}
          cards={deckCards}
          mode={effectiveMode}
          direction={direction}
          onRestart={() => setRound((r) => r + 1)}
        />
      )}
    </div>
  );
}

function buildQuestions(cards: Flashcard[], direction: Direction): Question[] {
  const answers = cards.map((c) => (direction === "forward" ? c.back : c.front));
  return shuffle(cards)
    .slice(0, QUIZ_LENGTH)
    .map((card) => {
      const fwd = direction === "forward";
      const answer = fwd ? card.back : card.front;
      return {
        card,
        prompt: fwd ? card.front : card.back,
        promptLang: fwd ? card.src : card.tgt,
        answer,
        answerLang: fwd ? card.tgt : card.src,
        choices: choicesFor(answer, answers),
      };
    });
}

function QuizRun({
  cards,
  mode,
  direction,
  onRestart,
}: {
  cards: Flashcard[];
  mode: Mode;
  direction: Direction;
  onRestart: () => void;
}) {
  const [questions] = useState(() => buildQuestions(cards, direction));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const q = questions[index];

  useEffect(() => {
    if (verdict) nextRef.current?.focus();
    else inputRef.current?.focus();
  }, [verdict, index]);

  if (!q) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="items-center py-12 text-center">
        <CardContent className="grid justify-items-center gap-3">
          <p className="font-display text-5xl font-semibold">
            {score}/{questions.length}
          </p>
          <p className="text-muted-foreground">
            {pct === 100 ? "Perfect score!" : pct >= 70 ? "Nice work." : "Keep studying — you’ll get there."}
          </p>
          <Button onClick={onRestart}>
            <RotateCcw /> Try another round
          </Button>
        </CardContent>
      </Card>
    );
  }

  function submit(answer: string) {
    if (verdict) return;
    const v = checkAnswer(answer, q.answer);
    setVerdict(v);
    if (v !== "wrong") setScore((s) => s + 1);
  }

  function next() {
    setIndex((i) => i + 1);
    setTyped("");
    setPicked(null);
    setVerdict(null);
  }

  const answerDir = LANGUAGES[q.answerLang].rtl ? "rtl" : "auto";

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {index + 1} / {questions.length}
        </span>
        <Progress value={(index / questions.length) * 100} className="flex-1" />
        <span className="tabular-nums">Score {score}</span>
      </div>

      <Card>
        <CardContent className="grid justify-items-center gap-2 py-10">
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Translate to {LANGUAGES[q.answerLang].name}
          </span>
          <p
            className="flex items-center gap-2 text-center font-display text-3xl font-medium"
            dir={LANGUAGES[q.promptLang].rtl ? "rtl" : "auto"}
          >
            {q.prompt}
            <SpeakButton text={q.prompt} lang={q.promptLang} />
          </p>
        </CardContent>
      </Card>

      {mode === "type" ? (
        <form
          className="flex gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (verdict) next();
            else submit(typed);
          }}
        >
          <Input
            ref={inputRef}
            value={typed}
            dir={answerDir}
            onChange={(e) => setTyped(e.target.value)}
            readOnly={!!verdict}
            placeholder="Your answer…"
            className="h-11 text-lg"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {!verdict && (
            <Button type="submit" size="lg" className="h-11" disabled={!typed.trim()}>
              Check
            </Button>
          )}
        </form>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {q.choices.map((c) => {
            const isAnswer = c === q.answer;
            return (
              <Button
                key={c}
                variant="outline"
                dir={answerDir}
                className={cn(
                  "h-auto justify-start py-3 text-left text-base whitespace-normal",
                  verdict && isAnswer && "border-emerald-500 bg-emerald-500/10",
                  verdict && picked === c && !isAnswer && "border-red-500 bg-red-500/10",
                )}
                onClick={() => {
                  setPicked(c);
                  submit(c);
                }}
                disabled={!!verdict && !isAnswer && picked !== c}
              >
                {c}
              </Button>
            );
          })}
        </div>
      )}

      {verdict && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border p-4",
            verdict === "wrong" ? "border-red-500/40 bg-red-500/5" : "border-emerald-500/40 bg-emerald-500/5",
          )}
        >
          {verdict === "wrong" ? (
            <XCircle className="size-5 text-red-500" />
          ) : (
            <CheckCircle2 className="size-5 text-emerald-500" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {verdict === "correct" ? "Correct!" : verdict === "close" ? "Close enough — watch the spelling." : "Not quite."}
            </p>
            {verdict !== "correct" && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground" dir="auto">
                Answer: <span className="font-medium text-foreground">{q.answer}</span>
                <SpeakButton text={q.answer} lang={q.answerLang} />
              </p>
            )}
          </div>
          <Button ref={nextRef} onClick={next}>
            {index + 1 < questions.length ? "Next" : "See results"} <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}
