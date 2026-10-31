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
import { checkAnswer, choicesFor, distinctCount, shuffle, type Verdict } from "@/lib/quiz";
import { useHydrated, useStore, type Flashcard } from "@/lib/store";
import { cn } from "@/lib/utils";

type Mode = "type" | "choice";
type Direction = "forward" | "reverse";

interface Question {
  card: Flashcard;
  prompt: string;
  promptLang: string;
  answer: string;
  /** Every answer accepted for this prompt: other cards may share the same front. */
  accepted: string[];
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
  // Multiple choice needs four answers that actually look different.
  const canChoose = distinctCount(deckCards.map((c) => (direction === "forward" ? c.back : c.front))) >= 4;
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
              <TabsTrigger value="choice" disabled={!canChoose}>
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

      {!canChoose && deckCards.length > 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">Multiple choice needs at least 4 different answers.</p>
      )}

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

/** Groups prompts that are the same word. Accents are kept: "pêche" and "pèche" are different words. */
function promptKey(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQuestions(cards: Flashcard[], direction: Direction): Question[] {
  const fwd = direction === "forward";
  const promptOf = (c: Flashcard) => (fwd ? c.front : c.back);
  const answerOf = (c: Flashcard) => (fwd ? c.back : c.front);
  return shuffle(cards)
    .slice(0, QUIZ_LENGTH)
    .map((card) => {
      const prompt = promptOf(card);
      const key = promptKey(prompt);
      const same = cards.filter((c) => promptKey(promptOf(c)) === key);
      const others = cards.filter((c) => promptKey(promptOf(c)) !== key);
      const answer = answerOf(card);
      return {
        card,
        prompt,
        promptLang: fwd ? card.src : card.tgt,
        answer,
        accepted: same.map(answerOf),
        answerLang: fwd ? card.tgt : card.src,
        // Distractors come only from cards with a different prompt, so none of them is also right.
        choices: choicesFor(answer, others.map(answerOf)),
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
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);

  const q = questions[index];
  // If this prompt's other answers leave too few distinct options, type it instead.
  const asChoice = mode === "choice" && !!q && q.choices.length >= 4;

  useEffect(() => {
    if (!q) restartRef.current?.focus();
    else if (verdict) nextRef.current?.focus();
    else if (asChoice) firstChoiceRef.current?.focus();
    else inputRef.current?.focus();
  }, [q, verdict, asChoice]);

  if (!q) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="items-center py-12 text-center">
        <CardContent className="grid justify-items-center gap-3" role="status">
          <p className="font-display text-5xl font-semibold">
            {score}/{questions.length}
          </p>
          <p className="text-muted-foreground">
            {pct === 100 ? "Perfect score!" : pct >= 70 ? "Nice work." : "Keep studying — you’ll get there."}
          </p>
          <Button ref={restartRef} onClick={onRestart}>
            <RotateCcw /> Try another round
          </Button>
        </CardContent>
      </Card>
    );
  }

  function submit(v: Verdict) {
    if (verdict) return;
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

      {!asChoice ? (
        <form
          className="flex gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (verdict) next();
            else submit(checkAnswer(typed, q.accepted));
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
          {q.choices.map((c, i) => {
            const isAnswer = c === q.answer;
            return (
              <Button
                key={c}
                ref={i === 0 ? firstChoiceRef : undefined}
                variant="outline"
                dir={answerDir}
                className={cn(
                  "h-auto justify-start py-3 text-left text-base whitespace-normal",
                  verdict && isAnswer && "border-emerald-500 bg-emerald-500/10",
                  verdict && picked === c && !isAnswer && "border-red-500 bg-red-500/10",
                )}
                onClick={() => {
                  // A picked option is right or wrong; "close enough" only applies to typing.
                  setPicked(c);
                  submit(isAnswer ? "correct" : "wrong");
                }}
                disabled={!!verdict && !isAnswer && picked !== c}
              >
                {c}
              </Button>
            );
          })}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {verdict === "correct"
          ? "Correct!"
          : verdict === "close"
            ? `Close enough. Correct spelling: ${q.answer}`
            : verdict
              ? `Not quite. Correct answer: ${q.answer}`
              : ""}
      </p>

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
