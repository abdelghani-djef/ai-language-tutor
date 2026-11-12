"use client";

import { ListChecks, Languages, RefreshCw, Sparkles, Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linked, WordDetails } from "@/components/story-text";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StoryQuiz } from "@/components/story-quiz";
import { WordOverlay } from "@/components/word/word-overlay";
import {
  alignTranslations,
  buildSentenceQuiz,
  cleanStory,
  isCleanStory,
  MIN_AI_WORDS,
  pickStoryWords,
  storySentences,
  wordsInStory,
  writeStory,
  type AiStoryText,
  type SentenceQuestion,
  type StoryWord,
} from "@/lib/ai-story";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { myCards, studyCards } from "@/lib/mywords";
import { speak, speechSupported } from "@/lib/speech";
import { useStarterWords } from "@/lib/starter-words";
import { highlightWords } from "@/lib/story";
import { useStore } from "@/lib/store";
import { STORY_MODEL_DTYPE } from "@/lib/story-model";
import { hasWebGPU, STORY_MODEL, STORY_MODEL_MB, useStoryWriter } from "@/lib/useStoryWriter";
import { useTranslator } from "@/lib/useTranslator";
import { isModelCached, translatorFor } from "@/lib/word/translate";
import { targetFromCard, type WordTarget } from "@/lib/word/target";
import { aiStory as messages } from "@/messages/ai-story";

type Phase = "consent" | "writing" | "checking" | "shown" | "failed" | "error";
type Shown = { story: AiStoryText; words: StoryWord[]; used: StoryWord[]; missed: StoryWord[] };
/** Translations of the story's sentences, in order: not asked for yet, failed, or the lines. */
type Translation = "none" | "failed" | string[];

/** A story the on-device model writes with the learner's Should learn words. Practice only, never saved. */
export function AiStory() {
  const t = useT(messages);
  const data = useStore();
  const words = useStarterWords();
  const writer = useStoryWriter();
  const translator = useTranslator();
  const [phase, setPhase] = useState<Phase>("consent");
  const [cached, setCached] = useState<boolean | null>(null);
  // Whether this browser can run the model at all (WebGPU only); null while checking.
  const [gpu, setGpu] = useState<boolean | null>(null);
  const [sentencesDone, setSentencesDone] = useState<{ done: number; total: number } | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [translation, setTranslation] = useState<Translation>("none");
  const [showTranslation, setShowTranslation] = useState(false);
  const [quiz, setQuiz] = useState<SentenceQuestion[] | null>(null);
  const [round, setRound] = useState(0);
  const [askedQuiz, setAskedQuiz] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [wordPage, setWordPage] = useState<WordTarget | null>(null);
  const lastWordButton = useRef<HTMLElement | null>(null);
  // Bumped by every run and by Stop, so a run that was stopped stays silent when it ends.
  const runId = useRef(0);
  // Bumped by every run, so a translation asked for an earlier story is dropped; and the pending one.
  const storyToken = useRef(0);
  const pendingTranslation = useRef<Promise<string[] | null> | null>(null);
  // Where focus goes once the next screen is shown, since the button that had it is gone.
  const focusNext = useRef<"stop" | "start" | "retry" | "story" | null>(null);
  const stopButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const storyTitle = useRef<HTMLHeadingElement>(null);

  const lang = data.profile?.lang ?? "en";
  const learn = studyCards(data);
  const enough = learn.length >= MIN_AI_WORDS;

  // Whether the model is already downloaded, and whether this browser can run it.
  const checkCached = useCallback(() => {
    isModelCached(STORY_MODEL, STORY_MODEL_DTYPE).then(setCached);
  }, []);
  useEffect(() => {
    checkCached();
    hasWebGPU().then(setGpu);
  }, [checkCached]);

  // Stop reading when leaving the page.
  useEffect(() => () => void (speechSupported && speechSynthesis.cancel()), []);

  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    ({ stop: stopButton, start: startButton, retry: retryButton, story: storyTitle })[target].current?.focus();
  }, [phase, quiz]);

  async function run() {
    if (!gpu) return;
    const id = ++runId.current;
    storyToken.current++;
    pendingTranslation.current = null;
    focusNext.current = "stop";
    setShown(null);
    setSelected(null);
    setTranslation("none");
    setShowTranslation(false);
    setQuiz(null);
    setAskedQuiz(false);
    setSentencesDone(null);
    // One automatic rewrite, with a new pick of words, when the story does not pass.
    for (let attempt = 0; attempt < 2; attempt++) {
      const picked = pickStoryWords(studyCards(data));
      writer.reset();
      setPhase("writing");
      const text = await writeStory(picked, writer.generate, (done, total) => {
        if (runId.current === id) setSentencesDone({ done, total });
      });
      if (runId.current !== id) return;
      if (text === null) return setPhase("error");
      setPhase("checking");
      const story = cleanStory(text);
      if (story && isCleanStory(story)) {
        setShown({ story, words: picked, ...wordsInStory(story, picked) });
        focusNext.current = "story";
        setPhase("shown");
        checkCached();
        return;
      }
    }
    focusNext.current = "retry";
    setPhase("failed");
  }

  function stop() {
    runId.current++;
    writer.cancel();
    focusNext.current = "start";
    setPhase("consent");
    checkCached();
  }

  const translatorChoice = translatorFor("en", lang);

  /** The translated sentences, or null when they could not be had. One request at a time, shared by its callers. */
  function translateStory(story: AiStoryText): Promise<string[] | null> {
    if (Array.isArray(translation)) return Promise.resolve(translation);
    if (pendingTranslation.current) return pendingTranslation.current;
    if (!translatorChoice) {
      setTranslation("failed");
      return Promise.resolve(null);
    }
    const token = storyToken.current;
    setTranslation("none");
    const sentences = storySentences(story).flat();
    const request = translator.translate(sentences.join("\n"), translatorChoice).then((text) => {
      // A new story drops this result.
      if (token !== storyToken.current) return null;
      pendingTranslation.current = null;
      const lines = text === null ? null : alignTranslations(sentences, text);
      setTranslation(lines ?? "failed");
      return lines;
    });
    pendingTranslation.current = request;
    return request;
  }

  async function takeQuiz() {
    if (!shown) return;
    setAskedQuiz(true);
    const token = storyToken.current;
    const lines = await translateStory(shown.story);
    if (!lines || token !== storyToken.current) return;
    startQuiz(lines);
  }

  // Questions are built again, reshuffled, from the same story.
  function startQuiz(lines: string[]) {
    if (!shown) return;
    const questions = buildSentenceQuiz(storySentences(shown.story).flat(), lines);
    if (questions.length > 0) {
      setQuiz(questions);
      setRound((r) => r + 1);
    }
  }

  function toggleTranslation() {
    if (!shown) return;
    setShowTranslation((s) => !s);
    if (!showTranslation) void translateStory(shown.story);
  }

  function readAloud() {
    if (!shown) return;
    if (reading) {
      speechSynthesis.cancel();
      setReading(false);
      return;
    }
    setReading(true);
    speak(`${shown.story.title}. ${shown.story.paragraphs.join(" ")}`, "en", () => setReading(false));
  }

  function select(id: string | null, from?: HTMLElement) {
    if (from) lastWordButton.current = from;
    setSelected(id);
  }

  function closeDetails() {
    setSelected(null);
    lastWordButton.current?.focus();
  }

  if (gpu === false) {
    return (
      <section className="grid gap-3 rounded-3xl border bg-card p-6">
        <p>{t("noGpu")}</p>
        <div>
          <Link href="/story/" className={buttonVariants()}>
            {t("readyMade")}
          </Link>
        </div>
      </section>
    );
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
        <p role="alert">{t("error")}</p>
        <div>
          <Link href="/story/" className={buttonVariants()}>
            {t("readyMade")}
          </Link>
        </div>
      </section>
    );
  }

  if (phase === "failed") {
    return (
      <section className="grid gap-3 rounded-3xl border bg-card p-6">
        <p role="alert">{t("failed")}</p>
        <div>
          <Button ref={retryButton} onClick={run}>
            <RefreshCw /> {t("tryAgain")}
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "consent") {
    return (
      <section className="grid gap-4 rounded-3xl border bg-card p-6">
        <p>{cached ? t("explainCached") : t("explainDownload", { mb: STORY_MODEL_MB })}</p>
        <div>
          <Button ref={startButton} onClick={run} disabled={cached === null || gpu === null}>
            <Sparkles /> {cached ? t("write") : t("download")}
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "writing" || phase === "checking" || !shown) {
    const downloading = writer.status === "loading" && writer.progress !== null;
    const percent = Math.round((writer.progress ?? 0) * 100);
    return (
      <section className="grid gap-4 rounded-3xl border bg-card p-6" aria-live="polite">
        {phase === "checking" ? (
          <p>{t("checking")}</p>
        ) : downloading ? (
          <>
            <p>{t("gettingReady")}</p>
            <Progress value={percent} aria-label={t("gettingReady")}>
              <span className="text-sm text-muted-foreground" aria-hidden>
                {t("percent", { percent })}
              </span>
            </Progress>
          </>
        ) : (
          <>
            <p className="font-medium">{t("writing")}</p>
            {sentencesDone && (
              <p className="text-sm text-muted-foreground">
                {t("sentences", { ...sentencesDone, count: sentencesDone.total })}
              </p>
            )}
          </>
        )}
        {phase === "writing" && (
          <div>
            <Button ref={stopButton} variant="outline" size="sm" onClick={stop}>
              <Square /> {t("stop")}
            </Button>
          </div>
        )}
      </section>
    );
  }

  const { story, used, missed } = shown;
  const translated = Array.isArray(translation) ? translation : null;
  if (quiz) {
    return (
      <StoryQuiz
        key={round}
        questions={quiz}
        lang={lang}
        onRetry={() => translated && startQuiz(translated)}
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
  const sentences = storySentences(story);
  // Each paragraph's share of the flat list of translated sentences.
  const starts = sentences.map((_, i) => sentences.slice(0, i).reduce((n, s) => n + s.length, 0));
  const perParagraph = sentences.map((s, i) => (translated ? translated.slice(starts[i], starts[i] + s.length) : []));
  const selectedCard = myCards(data).find((c) => c.id === selected);
  const showStatus = showTranslation || askedQuiz;
  const translatingNow = showStatus && translation === "none" && translatorChoice !== null;
  const rtl = LANGUAGES[lang].rtl;
  // Once the translations are known, no quiz button when they would not make a quiz.
  const quizPossible = !translated || buildSentenceQuiz(sentences.flat(), translated).length > 0;

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
                <Linked parts={highlightWords(paragraph, used)} today={todayIds} selected={selected} onSelect={select} />
              </p>
              {showTranslation && perParagraph[i].length > 0 && (
                <p className="text-muted-foreground" lang={lang} dir={rtl ? "rtl" : "ltr"}>
                  {perParagraph[i].join(" ")}
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
          <Button variant="outline" size="sm" aria-pressed={showTranslation} onClick={toggleTranslation}>
            <Languages /> {showTranslation ? t("hideTranslation") : t("showTranslation")}
          </Button>
          {quizPossible && (
            <Button variant="outline" size="sm" onClick={takeQuiz} disabled={translatingNow}>
              <ListChecks /> {t("takeQuiz")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={run}>
            <RefreshCw /> {t("newStory")}
          </Button>
        </div>

        {showStatus && (
          <div className="grid gap-1 text-sm text-muted-foreground" aria-live="polite">
            {translatingNow && translator.status === "loading" && translator.progress !== null && (
              <>
                <p>{t("translatorLoading")}</p>
                <Progress value={Math.round(translator.progress * 100)} aria-label={t("translatorLoading")} />
              </>
            )}
            {translatingNow && translator.status !== "loading" && <p>{t("translating")}</p>}
            {translation === "failed" && <p>{t("translateFailed")}</p>}
            {translated && <p>{t("machine")}</p>}
          </div>
        )}
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
