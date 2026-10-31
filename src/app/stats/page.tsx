"use client";

import { useState } from "react";
import { Heatmap } from "@/components/heatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pairLabel } from "@/lib/languages";
import { isLearned, Rating } from "@/lib/srs";
import { countByDay, dayKey, longestStreak, studyStreak } from "@/lib/stats";
import { dueToday, useHydrated, useStore } from "@/lib/store";

export default function StatsPage() {
  const { decks, cards, reviews } = useStore();
  const hydrated = useHydrated();
  const [now] = useState(Date.now);
  if (!hydrated) return null;

  const days = reviews.map((r) => r.day);
  const today = dayKey(new Date());
  const monthAgo = now - 30 * 86_400_000;
  const recent = reviews.filter((r) => r.reviewedAt >= monthAgo);
  const recalled = recent.filter((r) => r.rating !== Rating.Again).length;
  const learned = cards.filter((c) => isLearned(c.srs)).length;

  const tiles = [
    { label: "Cards learned", value: learned, hint: `of ${cards.length} total` },
    { label: "Current streak", value: studyStreak(days), hint: "days in a row" },
    { label: "Longest streak", value: longestStreak(days), hint: "days" },
    { label: "Due today", value: dueToday(cards).length, hint: "cards" },
    { label: "Reviews today", value: days.filter((d) => d === today).length, hint: "cards" },
    {
      label: "Recall rate",
      value: recent.length ? `${Math.round((recalled / recent.length) * 100)}%` : "—",
      hint: "last 30 days, not “Again”",
    },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">
          A card counts as learned once FSRS graduates it to the Review state.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="gap-1 py-4">
            <CardContent className="grid gap-0.5 px-4">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="font-display text-3xl font-semibold tabular-nums">{t.value}</span>
              <span className="text-xs text-muted-foreground">{t.hint}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Study activity</CardTitle>
          <CardDescription>
            {plural(reviews.length, "review")} on {plural(new Set(days).size, "day")} — the last six months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap counts={countByDay(days)} />
        </CardContent>
      </Card>

      {decks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By deck</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {decks.map((d) => {
                const dc = cards.filter((c) => c.deckId === d.id);
                const l = dc.filter((c) => isLearned(c.srs)).length;
                const pct = dc.length ? (l / dc.length) * 100 : 0;
                return (
                  <li key={d.id} className="grid gap-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        <span className="font-medium">{d.name}</span>{" "}
                        <span className="text-muted-foreground">· {pairLabel(d)}</span>
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {l}/{dc.length} learned
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
