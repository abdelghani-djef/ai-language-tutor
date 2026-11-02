"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** A circular progress meter for the daily goal. */
export function GoalRing({
  done,
  goal,
  size = 22,
  stroke = 3,
  className,
}: {
  done: number;
  goal: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? done / goal : 0);
  const met = frac >= 1;
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className={cn("transition-[stroke-dashoffset] duration-500", met ? "stroke-emerald-500" : "stroke-primary")}
        />
      </svg>
      {met && <Check className="absolute size-[55%] text-emerald-500" strokeWidth={3} />}
    </span>
  );
}
