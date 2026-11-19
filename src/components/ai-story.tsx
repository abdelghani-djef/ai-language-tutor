"use client";

import { ListChecks, Languages, Loader2, RefreshCw, Sparkles, Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Linked, WordDetails } from "@/components/story-text";
import { Button, buttonVariants } from "@/components/ui/button";
import { StoryQuiz } from "@/components/story-quiz";
import { WordOverlay } from "@/components/word/word-overlay";
import { aiStory } from "@/lib/ai-api";
import {
  MIN_AI_WORDS,
  pickStoryWords,
  readStory,
  storyProblem,
  storyQuiz,
  storyWords,
  wordsInStory,
  type AiStoryText,
  type SentenceQuestion,
  type StoryProblem,
  type StoryWord,
} from "@/lib/ai-story";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { myCards, studyCards } from "@/lib/mywords";
import { speak, speechSupported } from "@/lib/speech";
import { useStarterWords } from "@/lib/starter-words";
import { highlightWords } from "@/lib/story";
import { useStore } from "@/lib/store";
import { targetFromCard, type WordTarget } from "@/lib/word/target";
import { aiStory as messages } from "@/messages/ai-story";

/** "stopped": the learner pressed Stop, so nothing is written until they ask again. */
type Phase = "writing" | "shown" | "error" | "stopped";
type Shown = { story: AiStoryText; used: StoryWord[]; missed: StoryWord[]; quizPossible: boolean };

/** A story an AI writes (on the server) with the learner's Should learn words. Practice only, never saved. */
export function AiStory() {
  const t = useT(messages);
  const data = useStore();
  const words = useStarterWords();
  // The page shows this only with a profile, so the fallback is never used.
  const lang = data.profile?.lang ?? "fr";
  const enough = storyWords(studyCards(data)).length >= MIN_AI_WORDS;
  // Writing starts on opening; without enough words nothing runs until the learner asks.
  const [phase, setPhase] = useState<Phase>(enough ? "writing" : "stopped");
  const [problem, setProblem] = useState<StoryProblem>({ key: "unavailable" });
  const [shown, setShown] = useState<Shown | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [quiz, setQuiz] = useState<SentenceQuestion[] | null>(null);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [wordPage, setWordPage] = useState<WordTarget | null>(null);
  const lastWordButton = useRef<HTMLElement | null>(null);
  // The running request: aborted by Stop, by a new story and when leaving the page.
  const request = useRef<AbortController | null>(null);
  // Where focus goes once the next screen is shown, since the button that had it is gone.
  const focusNext = useRef<"stop" | "start" | "retry" | "story" | null>(null);
  const stopButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const storyTitle = useRef<HTMLHeadingElement>(null);

  function run() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    // A new story replaces the old one: stop reading the old one aloud.
    if (speechSupported) speechSynthesis.cancel();
    setReading(false);
    focusNext.current = "stop";
    setShown(null);
    setSelected(null);
    setShowTranslation(false);
    setQuiz(null);
    setPhase("writing");
    const picked = pickStoryWords(studyCards(data));
    aiStory(
      picked.map((w) => w.word),
      lang,
      controller.signal,
    ).then(
      (reply) => {
        if (controller.signal.aborted) return;
        const story = readStory(reply);
        if (!story) return fail({ key: "unsafe" });
        setShown({ story, ...wordsInStory(story, picked), quizPossible: storyQuiz(story).length > 0 });
        focusNext.current = "story";
        setPhase("shown");
      },
      (err: unknown) => {
        // Stopped, or replaced by a newer story: that one has the screen now.
        if (controller.signal.aborted) return;
        fail(storyProblem(err));
      },
    );
  }

  function fail(p: StoryProblem) {
    setProblem(p);
    focusNext.current = "retry";
    setPhase("error");
  }

  // Tapping AI Story starts writing at once. Started from a timer so that React's development
  // double mount (mount, unmount, mount) clears the first one before it sends anything:
  // each story uses the shared free allowance.
  useEffect(() => {
    if (!enough) return;
    const timer = setTimeout(run, 0);
    return () => {
      clearTimeout(timer);
      request.current?.abort();
    };
    // Once, on opening: later stories are asked for with the buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop reading when leaving the page.
  useEffect(() => () => void (speechSupported && speechSynthesis.cancel()), []);

  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    ({ stop: stopButton, start: startButton, retry: retryButton, story: storyTitle })[target].current?.focus();
  }, [phase, quiz]);

  function stop() {
    request.current?.abort();
    request.current = null;
    focusNext.current = "start";
    setPhase("stopped");
  }

  // Questions are built again, reshuffled, from the same story.
  function startQuiz() {
    if (!shown) return;
    const questions = storyQuiz(shown.story);
    if (questions.length > 0) {
      setQuiz(questions);
      setRound((r) => r + 1);
    }
  }

  function readAloud() {
    if (!shown) return;
    if (reading) {
      speechSynthesis.cancel();
      setReading(false);
      return;
    }
    setReading(true);
    const text = shown.story.paragraphs.flat().map((s) => s.en).join(" ");
    speak(`${shown.story.title}. ${text}`, "en", () => setReading(false));
  }

  function select(id: string | null, from?: HTMLElement) {
    if (from) lastWordButton.current = from;
    setSelected(id);
  }

  function closeDetails() {
    setSelected(null);
    lastWordButton.current?.focus();
  }

  if (!enough && phase !== "shown") {
    return (
      <section className="grid gap-3 rounded-3xl border bg-card p-6">
        <p>{t("needWords", { count: MIN_AI_WORDS })}</p>
        <div>
          <Link href="/my-words/" className={buttonVariants()}>
            {t("toMyWords")}
          </Link>
        </div>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="grid gap-3 rounded-3xl border bg-card p-6">
        <p role="alert">
          {problem.key === "busyMinutes" ? t("busyMinutes", { count: problem.minutes }) : t(problem.key)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button ref={retryButton} onClick={run}>
            <RefreshCw /> {t("tryAgain")}
          </Button>
          <Link href="/story/" className={buttonVariants({ variant: "outline" })}>
            {t("readyMade")}
          </Link>
        </div>
      </section>
    );
  }

  if (phase === "stopped") {
    return (
      <section className="grid gap-4 rounded-3xl border bg-card p-6">
        <div>
          <Button ref={startButton} onClick={run}>
            <Sparkles /> {t("write")}
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "writing" || !shown) {
    return (
      <section className="grid gap-4 rounded-3xl border bg-card p-6" aria-live="polite">
        <p className="flex items-center gap-2 font-medium">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {t("writing")}
        </p>
        <div>
          <Button ref={stopButton} variant="outline" size="sm" onClick={stop}>
            <Square /> {t("stop")}
          </Button>
        </div>
      </section>
    );
  }

  const { story, used, missed, quizPossible } = shown;
  if (quiz) {
    return (
      <StoryQuiz
        key={round}
        questions={quiz}
        lang={lang}
        onRetry={startQuiz}
        onNewStory={run}
        onBack={() => {
          focusNext.current = "story";
          setQuiz(null);
        }}
      />
    );
  }
  const todayIds = new Set(used.map((w) => w.id));
  const titleParts = highlightWords(story.title, used);
  const selectedCard = myCards(data).find((c) => c.id === selected);
  const rtl = LANGUAGES[lang].rtl;

  return (
    <div className="grid gap-6">
      <article className="grid gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-4" lang="en" dir="ltr">
          <h2 ref={storyTitle} tabIndex={-1} className="font-display text-3xl font-semibold outline-none">
            <Linked parts={titleParts} today={todayIds} selected={selected} onSelect={select} />
          </h2>
          {story.paragraphs.map((paragraph, i) => (
            <div key={i} className="grid gap-2">
              <p className="font-display text-xl leading-relaxed">
                <Linked
                  parts={highlightWords(paragraph.map((s) => s.en).join(" "), used)}
                  today={todayIds}
                  selected={selected}
                  onSelect={select}
                />
              </p>
              {showTranslation && (
                <p className="text-muted-foreground" lang={lang} dir={rtl ? "rtl" : "ltr"}>
                  {paragraph.map((s) => s.tr).join(" ")}
                </p>
              )}
            </div>
          ))}
        </div>

        {missed.length > 0 && (
          <p className="text-sm text-muted-foreground">{t("notInStory", { words: missed.map((w) => w.word).join(", ") })}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {speechSupported && (
            <Button variant="outline" size="sm" onClick={readAloud}>
              {reading ? <Square /> : <Volume2 />} {reading ? t("stopReading") : t("readAloud")}
            </Button>
          )}
          <Button variant="outline" size="sm" aria-pressed={showTranslation} onClick={() => setShowTranslation((s) => !s)}>
            <Languages /> {showTranslation ? t("hideTranslation") : t("showTranslation")}
          </Button>
          {quizPossible && (
            <Button variant="outline" size="sm" onClick={startQuiz}>
              <ListChecks /> {t("takeQuiz")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={run}>
            <RefreshCw /> {t("newStory")}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{t("note")}</p>
      </article>

      <section aria-live="polite" className="min-h-16">
        {selectedCard ? (
          <WordDetails
            card={selectedCard}
            onClose={closeDetails}
            onSeeAll={() => words && setWordPage(targetFromCard(selectedCard, words))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("tapWord")}</p>
        )}
      </section>

      <WordOverlay target={wordPage} onClose={() => setWordPage(null)} />
    </div>
  );
}
