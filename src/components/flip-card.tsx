"use client";

import { SpeakButton } from "@/components/speak-button";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";

interface Side {
  text: string;
  lang: string;
}

export function FlipCard({
  front,
  back,
  flipped,
  onFlip,
}: {
  front: Side;
  back: Side;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    // Clicking anywhere flips the card. It is not a button for keyboard and
    // screen-reader users: they use the "Show answer" button and Space, and the
    // card's text is read as normal content.
    <div onClick={onFlip} className="w-full cursor-pointer perspective-[1200px]">
      <div
        className={cn(
          "relative h-72 w-full transition-transform duration-500 transform-3d",
          flipped && "rotate-y-180",
        )}
      >
        <Face side={front} label={LANGUAGES[front.lang].name} hidden={flipped} />
        <Face side={back} label={LANGUAGES[back.lang].name} hidden={!flipped} className="rotate-y-180 bg-primary/5" />
      </div>
    </div>
  );
}

function Face({ side, label, hidden, className }: { side: Side; label: string; hidden: boolean; className?: string }) {
  return (
    // The face turned away is inert so its text and pronounce button can't be reached.
    <div
      inert={hidden}
      aria-hidden={hidden}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 shadow-sm backface-hidden",
        className,
      )}
    >
      <span className="absolute top-4 left-5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="absolute top-2.5 right-3">
        <SpeakButton text={side.text} lang={side.lang} />
      </span>
      <p
        dir={LANGUAGES[side.lang].rtl ? "rtl" : "auto"}
        className="text-center font-display text-3xl leading-snug font-medium text-balance sm:text-4xl"
      >
        {side.text}
      </p>
    </div>
  );
}
