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
import { confetti } from "@/lib/confetti";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { checkAnswer, choicesFor, distinctCount, shuffle, type Verdict } from "@/lib/quiz";
import { useListTitle } from "@/lib/list-title";
import { studyCards, validList } from "@/lib/mywords";
import { State } from "@/lib/srs";
import { hasTag, recordQuiz, useHydrated, useStore, type Flashcard } from "@/lib/store";
import { cn } from "@/lib/utils";
import { mywords } from "@/messages/mywords";
import { quiz } from "@/messages/quiz";

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

/** A word that has been shown or studied at least once: you can't quiz a word you've never seen. */
const started = (c: Flashcard) => c.srs.state !== State.New || !!c.introducedAt;

/** "/quiz/?list=food&tag=x": practice on the started Should learn words of My words. An old `?deck=` is ignored. */
function QuizPage() {
  const params = useSearchParams();
  // An unknown list (or none) means all of My words.
  const list = validList(params.get("list"));
  const tag = params.get("tag");
  const hydrated = useHydrated();
  const data = useStore();
  // Multiple choice by default; typing when the cards don't have four different answers.
  const [mode, setMode] = useState<Mode>("choice");
  const [direction, setDirection] = useState<Direction>("forward");
  const [round, setRound] = useState(0);
  const t = useT(quiz);
  const tm = useT(mywords);
  const fmt = useFormat();
  const listTitle = useListTitle(list);

  // The setup gate makes sure there is a profile on this page.
  if (!hydrated || !data.profile) return null;
  const pair = { src: "en", tgt: data.profile.lang };
  const listCards = studyCards(data, list);
  const allCards = listCards.filter(started);
  const quizCards = allCards.filter((c) => hasTag(c, tag));
  // Multiple choice needs four answers that actually look different.
  const canChoose = distinctCount(quizCards.map((c) => (direction === "forward" ? c.back : c.front))) >= 4;
  const effectiveMode = canChoose ? mode : "type";
  const listQuery = list ? `?list=${encodeURIComponent(list)}` : "";
  const studyQuery = new URLSearchParams();
  if (list) studyQuery.set("list", list);
  if (tag) studyQuery.set("tag", tag);
  const studyHref = `/study/${studyQuery.toString() ? `?${studyQuery}` : ""}`;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {t("title", { title: listTitle })}
            {/* bdi keeps a Latin tag next to a Latin list title from running together in Arabic. */}
            {tag && (
              <>
                {" · "}
                <bdi>#{tag}</bdi>
              </>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">{t("practiceOnly")}</p>
        </div>
        {quizCards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Tabs value={effectiveMode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList>
                <TabsTrigger value="choice" disabled={!canChoose}>
                  {t("modeChoice")}
                </TabsTrigger>
                <TabsTrigger value="type">{t("modeType")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={direction} onValueChange={(v) => setDirection(v as Direction)}>
              <TabsList>
                {/* Latin language codes always read left to right, even in Arabic. */}
                <TabsTrigger value="forward" title={fmt.pairLabel(pair)}>
                  <span dir="ltr">
                    {t("direction", { from: pair.src.toUpperCase(), arrow: "→", to: pair.tgt.toUpperCase() })}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="reverse" title={fmt.pairLabel({ src: pair.tgt, tgt: pair.src })}>
                  <span dir="ltr">
                    {t("direction", { from: pair.tgt.toUpperCase(), arrow: "→", to: pair.src.toUpperCase() })}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {!canChoose && quizCards.length > 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">{t("choiceNeeds", { count: 4 })}</p>
      )}

      {quizCards.length === 0 && tag && allCards.length > 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground" dir="auto">
            {t("noTagged", { tag: fmt.tag(tag) })}
          </p>
          <Link href={`/quiz/${listQuery}`} className={buttonVariants({ variant: "outline" })}>
            {t("wholeList")}
          </Link>
        </div>
      ) : listCards.length === 0 ? (
        // Nothing to learn in this scope at all: studying won't help, picking lists will.
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground">{tm("emptyLearn")}</p>
          <Link href="/words/" className={buttonVariants({ variant: "outline" })}>
            {tm("pickLists")}
          </Link>
        </div>
      ) : quizCards.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground">{t("noStarted")}</p>
          <Link href={studyHref} className={buttonVariants({ variant: "outline" })}>
            {tm("study")}
          </Link>
        </div>
      ) : (
        <QuizRun
          key={`${effectiveMode}-${direction}-${list ?? ""}-${tag ?? ""}-${round}`}
          cards={quizCards}
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
  const t = useT(quiz);
  const fmt = useFormat();

  const q = questions[index];
  // If this prompt's other answers leave too few distinct options, type it instead.
  const asChoice = mode === "choice" && !!q && q.choices.length >= 4;

  // Count the finished round once: a perfect score counts toward badges.
  const finished = !q;
  useEffect(() => {
    if (!finished) return;
    const celebrated = recordQuiz(score, questions.length);
    if (!celebrated && questions.length > 0 && score === questions.length) confetti();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the round ends
  }, [finished]);

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
            {t("finalScore", { score, total: questions.length })}
          </p>
          <p className="text-muted-foreground">
            {pct === 100 ? t("perfect") : pct >= 70 ? t("niceWork") : t("keepStudying")}
          </p>
          <Button ref={restartRef} onClick={onRestart}>
            <RotateCcw /> {t("tryAgain")}
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
          {t("position", { index: index + 1, total: questions.length })}
        </span>
        <Progress value={(index / questions.length) * 100} className="flex-1" />
        <span className="tabular-nums">{t("score", { score })}</span>
      </div>

      <Card>
        <CardContent className="grid justify-items-center gap-2 py-10">
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {t("translateTo", { language: fmt.languageName(q.answerLang) })}
          </span>
          <p
            className="flex items-center gap-2 text-center font-display text-3xl font-medium"
            dir={LANGUAGES[q.promptLang].rtl ? "rtl" : "auto"}
            lang={q.promptLang}
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
            lang={q.answerLang}
            onChange={(e) => setTyped(e.target.value)}
            readOnly={!!verdict}
            placeholder={t("placeholder")}
            className="h-11 text-lg"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {!verdict && (
            <Button type="submit" size="lg" className="h-11" disabled={!typed.trim()}>
              {t("check")}
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
                lang={q.answerLang}
                className={cn(
                  "h-auto justify-start py-3 text-start text-base whitespace-normal",
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
          ? t("correct")
          : verdict === "close"
            ? t("closeLive", { answer: q.answer })
            : verdict
              ? t("wrongLive", { answer: q.answer })
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
              {verdict === "correct" ? t("correct") : verdict === "close" ? t("close") : t("wrong")}
            </p>
            {verdict !== "correct" && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground" dir="auto">
                {t.rich("answer", { answer: <span className="font-medium text-foreground">{q.answer}</span> })}
                <SpeakButton text={q.answer} lang={q.answerLang} />
              </p>
            )}
          </div>
          <Button ref={nextRef} onClick={next}>
            {index + 1 < questions.length ? t("next") : t("seeResults")} <ArrowRight className="rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}
