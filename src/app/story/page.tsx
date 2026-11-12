"use client";

import { Languages, Sparkles, Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AiStory } from "@/components/ai-story";
import { Button, buttonVariants } from "@/components/ui/button";
import { StoryHeading, Linked, WordDetails } from "@/components/story-text";
import { WordOverlay } from "@/components/word/word-overlay";
import { STARTER_STORIES } from "@/data/starter-stories";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { myCards, sortedPacks } from "@/lib/mywords";
import { speak, speechSupported } from "@/lib/speech";
import { useStarterWords } from "@/lib/starter-words";
import { englishWord, highlightWords, metCards, rankStories, todaysCards } from "@/lib/story";
import { useHydrated, useStore, useToday } from "@/lib/store";
import { targetFromCard, type WordTarget } from "@/lib/word/target";
import { aiStory as aiMessages } from "@/messages/ai-story";
import { story as messages } from "@/messages/story";

export default function StoryPageWrapper() {
  return (
    <Suspense>
      <StoryPage />
    </Suspense>
  );
}

function StoryPage() {
  const params = useSearchParams();
  const storyId = params.get("id");
  const aiMode = params.get("ai") === "1";
  const t = useT(messages);
  const ta = useT(aiMessages);
  const hydrated = useHydrated();
  const data = useStore();
  const today = useToday();
  const [selected, setSelected] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [reading, setReading] = useState(false);
  const lastWordButton = useRef<HTMLElement | null>(null);
  // The word page, opened over the story so the story and its scroll stay put.
  const [wordPage, setWordPage] = useState<WordTarget | null>(null);
  // The lists' words: which lists the learner has sorted words from, and each word's list.
  const words = useStarterWords();

  // Stop reading when leaving the page.
  useEffect(() => () => void (speechSupported && speechSynthesis.cancel()), []);

  // The setup gate makes sure there is a profile on this page.
  if (!hydrated || !data.profile || !words) return null;

  if (aiMode) {
    return (
      <div className="mx-auto grid max-w-2xl gap-6">
        <StoryHeading />
        <div>
          <Link href="/story/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {ta("back")}
          </Link>
        </div>
        <AiStory />
      </div>
    );
  }

  const aiLink = (
    <Link href="/story/?ai=1" className={buttonVariants({ variant: "outline" })}>
      <Sparkles /> {ta("button")}
    </Link>
  );

  // Stories of the ready-made lists the learner has sorted words from, with
  // the learner's words in their current language.
  const cards = myCards(data);
  const packs = sortedPacks(data, words);
  const todays = todaysCards(cards, data.reviews, today);
  const ranked = rankStories(STARTER_STORIES, packs, todays);
  const current = ranked.find((r) => r.story.id === storyId) ?? ranked[0];

  if (!current) {
    return (
      <div className="mx-auto grid max-w-2xl gap-4">
        <StoryHeading />
        <p>{t("noStories")}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/words/" className={buttonVariants()}>
            {t("addPack")}
          </Link>
          {aiLink}
        </div>
      </div>
    );
  }

  const { story } = current;
  // Every word you've met is tappable; today's are highlighted more strongly.
  const met = metCards(cards);
  const todayIds = new Set(todays.map((c) => c.id));
  const linked = met.map((c) => ({ id: c.id, word: englishWord(c) ?? "" }));
  const titleParts = highlightWords(story.title.en, linked);
  const paragraphs = story.text.en.split(/\n\s*\n/).map((p) => highlightWords(p, linked));
  // Translations are in the language the learner learns English in.
  const lang = data.profile.lang;
  const translated = story.text[lang].split(/\n\s*\n/);
  const selectedCard = met.find((c) => c.id === selected);

  function select(id: string | null, from?: HTMLElement) {
    if (from) lastWordButton.current = from;
    setSelected(id);
  }

  function closeDetails() {
    setSelected(null);
    // Back to the word that opened the details.
    lastWordButton.current?.focus();
  }

  function readAloud() {
    if (reading) {
      speechSynthesis.cancel();
      setReading(false);
      return;
    }
    setReading(true);
    speak(`${story.title.en}. ${story.text.en}`, "en", () => setReading(false));
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <StoryHeading />
      <div>{aiLink}</div>

      <article className="grid gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-4" lang="en" dir="ltr">
          <h2 className="font-display text-3xl font-semibold">
            <Linked parts={titleParts} today={todayIds} selected={selected} onSelect={select} />
          </h2>
          {paragraphs.map((parts, i) => (
            <div key={i} className="grid gap-2">
              <p className="font-display text-xl leading-relaxed">
                <Linked parts={parts} today={todayIds} selected={selected} onSelect={select} />
              </p>
              {showTranslation && translated[i] && (
                <p className="text-muted-foreground" lang={lang} dir={LANGUAGES[lang].rtl ? "rtl" : "ltr"}>
                  {translated[i]}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {speechSupported && (
            <Button variant="outline" size="sm" onClick={readAloud}>
              {reading ? <Square /> : <Volume2 />} {reading ? t("stop") : t("readAloud")}
            </Button>
          )}
          <Button variant="outline" size="sm" aria-pressed={showTranslation} onClick={() => setShowTranslation((s) => !s)}>
            <Languages /> {showTranslation ? t("hideTranslation") : t("showTranslation")}
          </Button>
          {current.used > 0 && (
            <span className="text-sm text-muted-foreground">{t("todayWords", { count: current.used })}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("written")}</p>
      </article>

      <section aria-live="polite" className="min-h-16">
        {selectedCard ? (
          <WordDetails
            card={selectedCard}
            onClose={closeDetails}
            onSeeAll={() => setWordPage(targetFromCard(selectedCard, words))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("tapWord")}</p>
        )}
      </section>

      {ranked.length > 1 && (
        <section aria-labelledby="more-stories" className="grid gap-3">
          <h2 id="more-stories" className="font-display text-xl font-semibold">
            {t("more")}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ranked
              .filter((r) => r.story.id !== story.id)
              .slice(0, 8)
              .map(({ story: s }) => (
                <li key={s.id}>
                  <Link
                    href={`/story/?id=${encodeURIComponent(s.id)}`}
                    className="block rounded-xl border bg-card px-4 py-3 hover:bg-muted"
                  >
                    <span className="block font-medium" lang="en" dir="ltr">
                      {s.title.en}
                    </span>
                    <span className="block text-sm text-muted-foreground" lang={lang} dir="auto">
                      {s.title[lang]}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      <WordOverlay target={wordPage} onClose={() => setWordPage(null)} />
    </div>
  );
}
