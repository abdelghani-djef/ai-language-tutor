"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { useLocale, useT, type Locale, type Translate } from "@/lib/i18n";
import { highlightWords } from "@/lib/story";
import { cn } from "@/lib/utils";
import type { Place, Scene, SceneLine } from "@/lib/word/scenes";
import { clampScene, stepFor } from "@/lib/word/stage";
import { cleanWord } from "@/lib/word/target";
import { word as messages } from "@/messages/word";

type T = Translate<keyof (typeof messages)["en"]>;

/** Languages the ready-made scenes are translated into. */
const translated = (to: string): to is "fr" | "ar" => to === "fr" || to === "ar";

/**
 * The "In real life" scenes of a ready-made word, one at a time. On a computer: a wide stage with
 * round arrows on either side and a row of places to jump to. On a phone: a strip you swipe, with
 * dots and small arrows at its edges. The arrow keys move between scenes when focus is inside.
 */
export function SceneStage(props: StageProps) {
  // A new word starts again from its first scene, with the phone strip scrolled back.
  return <Stage key={props.word} {...props} />;
}

type StageProps = {
  word: string;
  scenes: Scene[];
  places: Record<string, Place>;
  to: "fr" | "ar" | string;
  rtl: boolean;
};

function Stage({ word, scenes, places, to, rtl }: StageProps) {
  const t = useT(messages);
  const [locale] = useLocale();
  const [index, setIndex] = useState(0);
  // Which way the last move went, so the new scene slides in from that side.
  const [moved, setMoved] = useState<-1 | 0 | 1>(0);
  const strip = useRef<HTMLDivElement>(null);
  // The desktop card is re-created on every move so it slides in. When focus was inside it (on a
  // speaker button or the credit link), it is handed to the new card so the arrow keys keep working.
  const card = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const count = scenes.length;
  const current = clampScene(index, count);

  // On a phone the visible scene is the one mostly in view of the strip.
  useEffect(() => {
    const root = strip.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (seen) setIndex(Number((seen.target as HTMLElement).dataset.index));
      },
      { root, threshold: 0.6 },
    );
    for (const item of root.children) observer.observe(item);
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    card.current?.focus({ preventScroll: true });
  }, [current]);

  if (!count) return null;

  const go = (i: number) => {
    const next = clampScene(i, count);
    if (next === current) return;
    refocus.current = !!card.current?.contains(document.activeElement);
    setMoved(next > current ? 1 : -1);
    setIndex(next);
    // Bring it into view on the phone strip (does nothing while the strip is hidden).
    const item = strip.current?.children[next];
    const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    item?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest", inline: "start" });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = stepFor(e.key, rtl);
    if (!step) return;
    e.preventDefault();
    go(current + step);
  };

  const placeOf = (scene: Scene, i: number) => {
    const place = places[scene.place];
    return {
      emoji: place?.emoji ?? "",
      label: place ? place.label[locale] || place.label.en : t("sceneOf", { n: i + 1, count }),
      picture: place?.picture,
    };
  };

  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const first = current === 0;
  const last = current === count - 1;
  const scene = scenes[current];
  const place = placeOf(scene, current);

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label={t("inRealLife")}
      onKeyDown={onKeyDown}
      // min-w-0 here and on the wrappers below: the phone strip's scenes side by side are far wider than the screen.
      className="grid min-w-0 gap-3"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold md:text-2xl">{t("inRealLife")}</h2>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {t("sceneOf", { n: current + 1, count })}
        </span>
      </div>

      {/* On a computer: the stage. */}
      <div className="hidden min-w-0 md:block">
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3.5">
          <ArrowButton label={t("prevScene")} disabled={first} onClick={() => go(current - 1)}>
            <Prev />
          </ArrowButton>
          <div className="overflow-hidden rounded-2xl">
            <div
              key={current}
              ref={card}
              tabIndex={-1}
              role="group"
              aria-roledescription="slide"
              aria-label={t("sceneOf", { n: current + 1, count })}
              className={cn(
                "grid min-h-72 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] overflow-hidden rounded-2xl border bg-card outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50",
                moved !== 0 && "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
                moved === 1 && "motion-safe:slide-in-from-end-8",
                moved === -1 && "motion-safe:slide-in-from-start-8",
              )}
            >
              <ScenePicture place={place} t={t} className="h-full" />
              <div className="grid content-center gap-3 px-6 py-5">
                <PlaceLabel place={place} />
                {scene.lines.map((line, i) => (
                  <Line key={i} line={line} word={word} to={to} locale={locale} t={t} />
                ))}
              </div>
            </div>
          </div>
          <ArrowButton label={t("nextScene")} disabled={last} onClick={() => go(current + 1)}>
            <Next />
          </ArrowButton>
        </div>
        <div className="mx-[58px] mt-3.5 flex gap-2">
          {scenes.map((s, i) => {
            const p = placeOf(s, i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={i === current}
                onClick={() => go(i)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-start text-sm text-muted-foreground outline-none transition-colors",
                  "hover:border-primary/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  i === current && "border-primary bg-primary/15 text-foreground",
                )}
              >
                {p.emoji && <span aria-hidden>{p.emoji}</span>}
                <span className="truncate">{p.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mx-[58px] mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="flex gap-1">
            <Kbd>←</Kbd>
            <Kbd>→</Kbd>
          </span>
          {t("keysHint")}
        </p>
      </div>

      {/* On a phone: a strip you swipe. */}
      <div className="relative min-w-0 md:hidden">
        <div
          ref={strip}
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {scenes.map((s, i) => {
            const p = placeOf(s, i);
            return (
              <div
                key={i}
                data-index={i}
                role="group"
                aria-roledescription="slide"
                aria-label={t("sceneOf", { n: i + 1, count })}
                className="shrink-0 basis-[85%] snap-start overflow-hidden rounded-2xl border bg-card"
              >
                <ScenePicture place={p} t={t} className="h-28" />
                <div className="grid gap-2.5 p-3">
                  <PlaceLabel place={p} />
                  {s.lines.map((line, j) => (
                    <Line key={j} line={line} word={word} to={to} locale={locale} t={t} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ArrowButton
          small
          label={t("prevScene")}
          disabled={first}
          onClick={() => go(current - 1)}
          className="absolute start-1 top-14 -translate-y-1/2"
        >
          <Prev />
        </ArrowButton>
        <ArrowButton
          small
          label={t("nextScene")}
          disabled={last}
          onClick={() => go(current + 1)}
          className="absolute end-1 top-14 -translate-y-1/2"
        >
          <Next />
        </ArrowButton>
        <div className="mt-2 flex justify-center">
          {scenes.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("sceneOf", { n: i + 1, count })}
              aria-pressed={i === current}
              onClick={() => go(i)}
              className="rounded-full p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className={cn("block size-1.5 rounded-full", i === current ? "bg-primary" : "bg-muted-foreground/40")} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * A round previous/next button. On the first or last scene it is faded and disabled, but stays
 * focusable so the arrow keys keep working after reaching the end.
 */
function ArrowButton({
  label,
  disabled,
  onClick,
  small,
  className,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  small?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={label}
      title={label}
      disabled={disabled}
      focusableWhenDisabled
      onClick={onClick}
      className={cn(
        "rounded-full hover:border-primary hover:text-primary data-disabled:cursor-default data-disabled:opacity-35 data-disabled:hover:border-border data-disabled:hover:text-foreground",
        small ? "size-8 bg-card/90 shadow-sm dark:bg-card/90 backdrop-blur-sm [&_svg:not([class*='size-'])]:size-4" : "size-11 bg-card dark:bg-card [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
    >
      {children}
    </Button>
  );
}

type PlaceView = { emoji: string; label: string; picture?: Place["picture"] };

function PlaceLabel({ place }: { place: PlaceView }) {
  return (
    <p className="text-sm text-muted-foreground">
      {place.emoji && <span aria-hidden>{place.emoji} </span>}
      {place.label}
    </p>
  );
}

/** The place's picture with its credit, or its emoji when it has no picture. */
function ScenePicture({ place, t, className }: { place: PlaceView; t: T; className?: string }) {
  const pic = place.picture;
  if (!pic) {
    return (
      <div aria-hidden className={cn("grid place-items-center bg-muted text-5xl", className)}>
        {place.emoji}
      </div>
    );
  }
  const credit =
    pic.author && pic.licence ? t("creditPicture", { author: pic.author, licence: pic.licence }) : (pic.author ?? pic.licence);
  return (
    <figure className={cn("relative m-0 bg-muted", className)}>
      {/* The place's name in the interface language (the caption is English only). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote Commons thumbnails */}
      <img src={pic.thumb} alt={place.label} loading="lazy" className="size-full object-cover" />
      {credit && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-0.5 text-[11px] text-white">
          <a
            href={pic.page}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white"
          >
            {credit}
          </a>
        </figcaption>
      )}
    </figure>
  );
}

/** The English text with the page's word highlighted, as in stories. */
function Highlighted({ text, word }: { text: string; word: string }) {
  return highlightWords(text, [{ id: "w", word: cleanWord(word) }]).map((part, i) =>
    part.cardId ? (
      <mark key={i} className="rounded-md bg-primary/15 px-0.5 font-semibold text-foreground">
        {part.text}
      </mark>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}

/**
 * One line of a scene: who speaks (in the interface language when written, else English), the
 * English text, a speaker button and, for French or Arabic learners, the translation under it.
 * `compact` is the phone's chat bubble, with your own lines on the end side.
 */
function Line({
  line,
  word,
  to,
  locale,
  t,
  compact,
}: {
  line: SceneLine;
  word: string;
  to: string;
  locale: Locale;
  t: T;
  compact?: boolean;
}) {
  const who = line.who[locale] || line.who.en;
  const translation = translated(to) ? line.text[to] : "";
  const speak = <SpeakButton text={line.text.en} lang="en" label={`${t("listen")}: ${line.text.en}`} className="text-muted-foreground" />;
  const text = (
    <>
      {/* In the page's direction, with the English isolated: in right to left it starts on the right, like its translation. */}
      <p className={cn("font-display text-start", compact ? "text-base leading-snug" : "text-xl leading-snug")}>
        <bdi lang="en" dir="ltr">
          <Highlighted text={line.text.en} word={word} />
        </bdi>
      </p>
      {translation && (
        <p className="mt-0.5 text-start text-sm text-muted-foreground">
          <bdi lang={to} dir={to === "ar" ? "rtl" : "ltr"}>
            {translation}
          </bdi>
        </p>
      )}
    </>
  );

  if (compact) {
    const mine = line.who.en.trim().toLowerCase() === "you";
    return (
      <div className={cn("flex max-w-[92%] items-start gap-1", mine && "flex-row-reverse justify-self-end")}>
        <div className={cn("min-w-0 rounded-xl px-2.5 py-1.5", mine ? "bg-primary/15" : "bg-muted")}>
          <p className="text-xs text-muted-foreground">{who}</p>
          {text}
        </div>
        {speak}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[86px_1fr_28px] items-start gap-2.5">
      <span className="pt-1 text-sm text-muted-foreground">{who}</span>
      <div className="min-w-0">{text}</div>
      {speak}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-b-2 px-1.5 font-sans text-xs text-foreground">{children}</kbd>;
}
