"use client";

import { useState } from "react";
import { BadgesCard } from "@/components/badges-card";
import { GoalCard } from "@/components/goal-card";
import { Heatmap } from "@/components/heatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { isLearned, Rating } from "@/lib/srs";
import { countByDay, dayKey, longestStreak, studyStreak } from "@/lib/stats";
import { dueToday, useHydrated, useStore } from "@/lib/store";
import { stats } from "@/messages/stats";

export default function StatsPage() {
  const { decks, cards, reviews } = useStore();
  const hydrated = useHydrated();
  const [now] = useState(Date.now);
  const t = useT(stats);
  const fmt = useFormat();
  if (!hydrated) return null;

  const days = reviews.map((r) => r.day);
  const today = dayKey(new Date());
  const monthAgo = now - 30 * 86_400_000;
  const recent = reviews.filter((r) => r.reviewedAt >= monthAgo);
  const recalled = recent.filter((r) => r.rating !== Rating.Again).length;
  const learned = cards.filter((c) => isLearned(c.srs)).length;

  const streak = studyStreak(days);
  const longest = longestStreak(days);
  const due = dueToday(cards).length;
  const reviewedToday = days.filter((d) => d === today).length;
  const tiles = [
    { label: t("cardsLearned"), value: fmt.number(learned), hint: t("cardsLearnedHint", { count: cards.length }) },
    { label: t("currentStreak"), value: fmt.number(streak), hint: t("currentStreakHint", { count: streak }) },
    { label: t("longestStreak"), value: fmt.number(longest), hint: t("longestStreakHint", { count: longest }) },
    { label: t("dueToday"), value: fmt.number(due), hint: t("cardsHint", { count: due }) },
    { label: t("reviewsToday"), value: fmt.number(reviewedToday), hint: t("cardsHint", { count: reviewedToday }) },
    {
      label: t("recallRate"),
      value: recent.length ? fmt.percent(recalled / recent.length) : "—",
      hint: t("recallRateHint"),
    },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <GoalCard />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="gap-1 py-4">
            <CardContent className="grid gap-0.5 px-4">
              <span className="text-sm text-muted-foreground">{tile.label}</span>
              <span className="font-display text-3xl font-semibold tabular-nums">{tile.value}</span>
              <span className="text-xs text-muted-foreground">{tile.hint}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("activityTitle")}</CardTitle>
          <CardDescription>
            {t("activityDescription", {
              count: reviews.length,
              days: t("activityDays", { count: new Set(days).size }),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap counts={countByDay(days)} />
        </CardContent>
      </Card>

      <BadgesCard />

      {decks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("byDeck")}</CardTitle>
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
                        <span className="text-muted-foreground">· {fmt.pairLabel(d)}</span>
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {t("deckLearned", { count: l, total: dc.length })}
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
