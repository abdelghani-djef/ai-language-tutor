"use client";

import { ArrowRight, BookOpen, CheckCircle2, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SentenceQuestion } from "@/lib/ai-story";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { aiStory } from "@/messages/ai-story";
import { quiz } from "@/messages/quiz";

/** Practice questions on the story: an English sentence and its translation among 4. Never recorded or saved. */
export function StoryQuiz({
  questions,
  lang,
  onRetry,
  onNewStory,
  onBack,
}: {
  questions: SentenceQuestion[];
  lang: keyof typeof LANGUAGES;
  onRetry: () => void;
  onNewStory: () => void;
  onBack: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const t = useT(quiz);
  const ta = useT(aiStory);

  const q = questions[index];
  const answered = picked !== null;
  const rtl = LANGUAGES[lang].rtl;

  useEffect(() => {
    if (!q) retryRef.current?.focus();
    else if (answered) nextRef.current?.focus();
    else firstChoiceRef.current?.focus();
  }, [q, answered]);

  function pick(choice: string) {
    if (!q || answered) return;
    setPicked(choice);
    if (choice === q.answer) setScore((s) => s + 1);
  }

  // Keys 1 to 4 pick a choice.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || !q || answered) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.choices.length) pick(q.choices[n - 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pick only reads q and answered
  }, [q, answered]);

  const actions = (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" onClick={onNewStory}>
        <RefreshCw /> {ta("newStory")}
      </Button>
      <Button variant="outline" onClick={onBack}>
        <BookOpen /> {ta("backToStory")}
      </Button>
    </div>
  );

  if (!q) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="items-center py-12 text-center">
        <CardContent className="grid justify-items-center gap-3" role="status">
          <p className="font-display text-5xl font-semibold">{t("finalScore", { score, total: questions.length })}</p>
          <p className="text-muted-foreground">{pct === 100 ? t("perfect") : pct >= 70 ? t("niceWork") : t("keepStudying")}</p>
          <Button ref={retryRef} onClick={onRetry}>
            <RotateCcw /> {ta("tryAgain")}
          </Button>
          {actions}
          <p className="text-xs text-muted-foreground">{ta("quizNote")}</p>
        </CardContent>
      </Card>
    );
  }

  const right = picked === q.answer;

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">{t("position", { index: index + 1, total: questions.length })}</span>
        <Progress value={(index / questions.length) * 100} className="flex-1" />
        <span className="tabular-nums">{t("score", { score })}</span>
      </div>

      <Card>
        <CardContent className="grid justify-items-center gap-2 py-10">
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{ta("pickTranslation")}</span>
          <p className="flex items-center gap-2 text-center font-display text-2xl font-medium" lang="en" dir="ltr">
            {q.sentence}
            <SpeakButton text={q.sentence} lang="en" />
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {q.choices.map((c, i) => {
          const isAnswer = c === q.answer;
          return (
            <Button
              key={c}
              ref={i === 0 ? firstChoiceRef : undefined}
              variant="outline"
              dir={rtl ? "rtl" : "ltr"}
              lang={lang}
              className={cn(
                "h-auto justify-start py-3 text-start text-base whitespace-normal",
                answered && isAnswer && "border-emerald-500 bg-emerald-500/10",
                answered && picked === c && !isAnswer && "border-red-500 bg-red-500/10",
              )}
              onClick={() => pick(c)}
              disabled={answered && !isAnswer && picked !== c}
            >
              {c}
            </Button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {answered ? (right ? t("correct") : t("wrongLive", { answer: q.answer })) : ""}
      </p>

      {answered && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border p-4",
            right ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5",
          )}
        >
          {right ? <CheckCircle2 className="size-5 text-emerald-500" /> : <XCircle className="size-5 text-red-500" />}
          <p className="flex-1 font-medium">{right ? t("correct") : t("wrong")}</p>
          <Button
            ref={nextRef}
            onClick={() => {
              setIndex((i) => i + 1);
              setPicked(null);
            }}
          >
            {index + 1 < questions.length ? t("next") : t("seeResults")} <ArrowRight className="rtl:rotate-180" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{ta("quizNote")}</p>
    </div>
  );
}
