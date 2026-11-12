"use client";

import { BookA, BookOpen, X } from "lucide-react";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { englishWord, type StoryPart } from "@/lib/story";
import { type Flashcard } from "@/lib/store";
import { cn } from "@/lib/utils";
import { story as messages } from "@/messages/story";
import { word as wordMessages } from "@/messages/word";

export function StoryHeading() {
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
export function Linked({
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

/** What a tapped word means: its picture, translation, example and audio, and a way to its word page. */
export function WordDetails({ card, onClose, onSeeAll }: { card: Flashcard; onClose: () => void; onSeeAll: () => void }) {
  const t = useT(messages);
  const tw = useT(wordMessages);
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
      <Button variant="outline" size="sm" className="mt-1 w-fit" onClick={onSeeAll}>
        <BookA /> {tw("seeAll")}
      </Button>
    </div>
  );
}
