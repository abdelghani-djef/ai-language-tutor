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
    // A div, not a <button>, because the faces contain their own pronounce buttons.
    // Space/Enter flipping is handled by the study page's keyboard shortcuts.
    <div
      role="button"
      tabIndex={0}
      onClick={onFlip}
      aria-label={flipped ? "Show front" : "Show answer"}
      className="group w-full cursor-pointer perspective-[1200px] outline-none"
    >
      <div
        className={cn(
          "relative h-72 w-full transition-transform duration-500 transform-3d",
          flipped && "rotate-y-180",
        )}
      >
        <Face side={front} label={LANGUAGES[front.lang].name} />
        <Face side={back} label={LANGUAGES[back.lang].name} className="rotate-y-180 bg-primary/5" />
      </div>
    </div>
  );
}

function Face({ side, label, className }: { side: Side; label: string; className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 shadow-sm backface-hidden group-focus-visible:ring-3 group-focus-visible:ring-ring/50",
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
