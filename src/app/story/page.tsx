"use client";

import { BookOpen, Languages, Square, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { SpeakButton } from "@/components/speak-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { STARTER_STORIES } from "@/data/starter-stories";
import { useFormat } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { speak, speechSupported } from "@/lib/speech";
import { englishWord, highlightWords, metCards, rankStories, todaysCards, type StoryPart } from "@/lib/story";
import { useHydrated, useStore, useToday, type Flashcard } from "@/lib/store";
import { cn } from "@/lib/utils";
import { story as messages } from "@/messages/story";

type StoryLang = "fr" | "ar";

export default function StoryPageWrapper() {
  return (
    <Suspense>
      <StoryPage />
    </Suspense>
  );
}

function StoryPage() {
  const params = useSearchParams();
  const deckId = params.get("deck");
  const storyId = params.get("id");
  const t = useT(messages);
  const [locale] = useLocale();
  const hydrated = useHydrated();
  const { cards, reviews } = useStore();
  const today = useToday();
  const [selected, setSelected] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [reading, setReading] = useState(false);
  const lastWordButton = useRef<HTMLElement | null>(null);

  // Stop reading when leaving the page.
  useEffect(() => () => void (speechSupported && speechSynthesis.cancel()), []);

  if (!hydrated) return null;

  const packs = new Set(cards.map((c) => c.pack).filter((p): p is string => !!p));
  const todays = todaysCards(cards, reviews, today, deckId);
  const ranked = rankStories(STARTER_STORIES, packs, todays);
  const current = ranked.find((r) => r.story.id === storyId) ?? ranked[0];

  if (!current) {
    return (
      <div className="mx-auto grid max-w-2xl gap-4">
        <Heading />
        <p>{t("noStories")}</p>
        <div>
          <Link href="/words" className={buttonVariants()}>
            {t("addPack")}
          </Link>
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
  // Translations are in the interface language when the stories have it, else the starter words' language.
  const packLang = cards.find((c) => c.pack)?.tgt;
  const lang: StoryLang | null =
    locale === "fr" || locale === "ar" ? locale : packLang === "fr" || packLang === "ar" ? packLang : null;
  const translated = lang ? story.text[lang].split(/\n\s*\n/) : [];
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
      <Heading />

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
              {showTranslation && lang && translated[i] && (
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
          {lang && (
            <Button variant="outline" size="sm" aria-pressed={showTranslation} onClick={() => setShowTranslation((s) => !s)}>
              <Languages /> {showTranslation ? t("hideTranslation") : t("showTranslation")}
            </Button>
          )}
          {current.used > 0 && (
            <span className="text-sm text-muted-foreground">{t("todayWords", { count: current.used })}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("written")}</p>
      </article>

      <section aria-live="polite" className="min-h-16">
        {selectedCard ? (
          <WordDetails card={selectedCard} onClose={closeDetails} />
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
                    href={`/story?id=${s.id}${deckId ? `&deck=${deckId}` : ""}`}
                    className="block rounded-xl border bg-card px-4 py-3 hover:bg-muted"
                  >
                    <span className="block font-medium" lang="en" dir="ltr">
                      {s.title.en}
                    </span>
                    {lang && (
                      <span className="block text-sm text-muted-foreground" lang={lang} dir="auto">
                        {s.title[lang]}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Heading() {
  const t = useT(messages);
  return (
    <div className="grid gap-2">
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
        <BookOpen className="size-7 text-primary" aria-hidden /> {t("title")}
      </h1>
      <p className="text-muted-foreground">{t("intro")}</p>
    </div>
  );
}

/** Story text with each learned word as a button that shows what it means. */
function Linked({
  parts,
  today,
  selected,
  onSelect,
}: {
  parts: StoryPart[];
  today: Set<string>;
  selected: string | null;
  onSelect: (id: string | null, from?: HTMLElement) => void;
}) {
  return parts.map((p, i) =>
    p.cardId ? (
      <button
        key={i}
        type="button"
        aria-pressed={selected === p.cardId}
        onClick={(e) => onSelect(selected === p.cardId ? null : p.cardId!, e.currentTarget)}
        className={cn(
          "rounded-md px-0.5 text-foreground underline decoration-dotted underline-offset-4",
          selected === p.cardId
            ? "bg-primary text-primary-foreground decoration-primary-foreground hover:bg-primary/90"
            : today.has(p.cardId)
              ? "bg-primary/15 font-semibold decoration-primary hover:bg-primary/25"
              : "decoration-primary/50 hover:bg-primary/10",
        )}
      >
        {p.text}
      </button>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

/** What a tapped word means: its picture, translation, example and audio. */
function WordDetails({ card, onClose }: { card: Flashcard; onClose: () => void }) {
  const t = useT(messages);
  const fmt = useFormat();
  const english = englishWord(card) ?? card.front;
  const otherLang = card.src === "en" ? card.tgt : card.src;
  const meaning = card.src === "en" ? card.back : card.front;
  const exampleLang = card.exampleLang ?? card.tgt;
  return (
    <div className="grid gap-2 rounded-2xl border bg-primary/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-2xl font-semibold">
          {card.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing to optimize
            <img src={card.image} alt="" className="size-12 rounded-lg border object-cover" />
          ) : (
            card.emoji && <span aria-hidden>{card.emoji}</span>
          )}
          <span lang="en" dir="ltr">
            {english}
          </span>
          <SpeakButton text={english} lang="en" label={t("pronounceWord", { word: english })} />
        </p>
        <Button variant="ghost" size="icon-sm" aria-label={t("close")} onClick={onClose}>
          <X />
        </Button>
      </div>
      <p className="flex flex-wrap items-center gap-1 text-lg">
        <span className="text-sm text-muted-foreground">
          {t("meaning")} ({fmt.languageNameInline(otherLang)}):
        </span>
        <span lang={otherLang} dir={LANGUAGES[otherLang]?.rtl ? "rtl" : "auto"} className="font-medium">
          {meaning}
        </span>
        <SpeakButton text={meaning} lang={otherLang} label={t("pronounceWord", { word: meaning })} />
      </p>
      {card.example && (
        <p className="flex items-center gap-1 text-muted-foreground italic">
          <span lang={exampleLang} dir="auto">
            {card.example}
          </span>
          <SpeakButton text={card.example} lang={exampleLang} label={t("pronounceWord", { word: card.example })} />
        </p>
      )}
    </div>
  );
}
