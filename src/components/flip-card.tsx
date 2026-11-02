"use client";

import type { ReactNode } from "react";
import { SpeakButton } from "@/components/speak-button";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { cards } from "@/messages/cards";

interface Side {
  text: string;
  lang: string;
}

/** What the answer side can show besides the translation. */
export interface Extras {
  example?: string;
  notes?: string;
  image?: string;
}

export function FlipCard({
  front,
  back,
  extras = {},
  flipped,
  onFlip,
}: {
  front: Side;
  back: Side;
  extras?: Extras;
  flipped: boolean;
  onFlip: () => void;
}) {
  const t = useT(cards);
  const fmt = useFormat();
  return (
    // Clicking anywhere flips the card. It is not a button for keyboard and
    // screen-reader users: they use the "Show answer" button and Space, and the
    // card's text is read as normal content.
    <div onClick={onFlip} className="w-full cursor-pointer perspective-[1200px]">
      {/* Both faces share one grid cell, so the card is as tall as the fuller side. */}
      <div className={cn("grid transition-transform duration-500 transform-3d", flipped && "rotate-y-180")}>
        <Face side={front} label={fmt.languageName(front.lang)} hidden={flipped} />
        <Face side={back} label={fmt.languageName(back.lang)} hidden={!flipped} className="rotate-y-180 bg-primary/5">
          {extras.image && (
            // eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing to optimize
            <img
              src={extras.image}
              alt={t("pictureAlt", { word: back.text })}
              className="order-first max-h-32 rounded-xl border object-contain"
            />
          )}
          {extras.example && (
            <p className="flex max-w-prose items-center gap-1 text-center text-base text-muted-foreground italic">
              <span className="sr-only">{t("exampleLabel")}: </span>
              <span dir={LANGUAGES[back.lang].rtl ? "rtl" : "auto"} lang={back.lang}>
                {extras.example}
              </span>
              <SpeakButton text={extras.example} lang={back.lang} />
            </p>
          )}
          {extras.notes && (
            <p className="max-w-prose text-center text-sm whitespace-pre-line text-muted-foreground">
              <span className="sr-only">{t("notesLabel")}: </span>
              {/* dir on the text itself: the hidden label would otherwise set the direction. */}
              <span dir="auto">{extras.notes}</span>
            </p>
          )}
        </Face>
      </div>
    </div>
  );
}

function Face({
  side,
  label,
  hidden,
  className,
  children,
}: {
  side: Side;
  label: string;
  hidden: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    // The face turned away is inert so its text and pronounce button can't be reached.
    <div
      inert={hidden}
      aria-hidden={hidden}
      className={cn(
        "relative col-start-1 row-start-1 flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border bg-card px-8 pt-12 pb-8 shadow-sm backface-hidden",
        className,
      )}
    >
      <span className="absolute top-4 inset-s-5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="absolute top-2.5 inset-e-3">
        <SpeakButton text={side.text} lang={side.lang} />
      </span>
      <p
        dir={LANGUAGES[side.lang].rtl ? "rtl" : "auto"}
        lang={side.lang}
        className="text-center font-display text-3xl leading-snug font-medium text-balance sm:text-4xl"
      >
        {side.text}
      </p>
      {children}
    </div>
  );
}
