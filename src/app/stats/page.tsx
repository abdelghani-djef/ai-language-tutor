"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BadgesCard } from "@/components/badges-card";
import { GoalCard } from "@/components/goal-card";
import { PlanCard } from "@/components/plan-card";
import { Heatmap } from "@/components/heatmap";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { YouCard } from "@/components/you-card";
import { STARTER_PACKS } from "@/data/starter-packs";
import { useFormat } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n";
import { knownWords, levelOf, myCards, packProgress, sortedPacks, type LevelId } from "@/lib/mywords";
import { isLearned, Rating, State } from "@/lib/srs";
import { countByDay, dayKey, studyStreak, totalStudyDays } from "@/lib/stats";
import { useStarterWords } from "@/lib/starter-words";
import { dueCount, useHydrated, useStore } from "@/lib/store";
import { levelName, sort as sortMessages } from "@/messages/sort";
import { stats } from "@/messages/stats";

export default function StatsPage() {
  const store = useStore();
  const { reviews } = store;
  const hydrated = useHydrated();
  const [now] = useState(Date.now);
  const t = useT(stats);
  const ts = useT(sortMessages);
  const fmt = useFormat();
  const [locale] = useLocale();
  // The lists' words: Already know, the level and each list's progress count them.
  const words = useStarterWords();
  if (!hydrated || !words) return null;

  const days = reviews.map((r) => r.day);
  const today = dayKey(new Date());
  const monthAgo = now - 30 * 86_400_000;
  // Recall rate is about remembering over time: only reviews of words already in
  // long-term review count, not first looks or practice within the same session.
  const recent = reviews.filter(
    (r) => r.reviewedAt >= monthAgo && !r.intro && (r.prevState === undefined || r.prevState === State.Review),
  );
  const recalled = recent.filter((r) => r.rating !== Rating.Again).length;
  // My words in the learner's current language, like the rest of the page (badges still count every word).
  const mine = myCards(store);
  const learned = mine.filter((c) => isLearned(c.srs)).length;

  const streak = studyStreak(days);
  const studiedDays = totalStudyDays(days);
  const due = dueCount(store, today);
  const reviewedToday = days.filter((d) => d === today).length;

  // My words, in the learner's current language only.
  const learnCount = mine.filter((c) => c.status === "learn").length;
  const knownCount = knownWords(store, words).length;
  const level = levelOf(store, words);
  const levelLabel = (id: LevelId): ReactNode =>
    // A1–B2 are Latin codes: their own left-to-right run inside Arabic text.
    id === "starter" ? ts(levelName[id]) : <bdi dir="ltr">{ts(levelName[id])}</bdi>;
  // A line for each ready-made list with words sorted in this language, in the lists' order.
  const sortedIds = sortedPacks(store, words);
  const packs = STARTER_PACKS.filter((p) => sortedIds.has(p.id)).map((pack) => ({
    pack,
    p: packProgress(store, pack.id, words),
  }));
  const tiles = [
    { label: t("cardsLearned"), value: fmt.number(learned), hint: t("cardsLearnedHint", { count: mine.length }) },
    { label: t("currentStreak"), value: fmt.number(streak), hint: t("currentStreakHint", { count: streak }) },
    // A running total next to the streak: progress that a missed day can't take away.
    { label: t("daysStudied"), value: fmt.number(studiedDays), hint: t("daysStudiedHint", { count: studiedDays }) },
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
      <PlanCard />

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

      {store.profile && (
        <Card>
          <CardHeader>
            <CardTitle>{t("myWordsTitle")}</CardTitle>
            <CardDescription>
              {t("myWordsDescription", { language: fmt.languageNameInline(store.profile.lang) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: t("shouldLearn"), value: fmt.number(learnCount) },
                { label: t("alreadyKnow"), value: fmt.number(knownCount) },
                { label: t("level"), value: levelLabel(level.id) },
              ].map((item) => (
                <div key={item.label} className="grid min-w-0 content-start gap-0.5 rounded-xl border p-2.5 sm:p-3">
                  <dt className="text-sm text-muted-foreground">{item.label}</dt>
                  <dd className="font-display text-xl font-semibold break-words tabular-nums sm:text-2xl">{item.value}</dd>
                </div>
              ))}
            </dl>

            {packs.length > 0 && (
              <section className="grid gap-3" aria-labelledby="stats-by-list">
                <p id="stats-by-list" className="text-sm font-medium">
                  {t("byList")}
                </p>
                <ul className="grid gap-4">
                  {packs.map(({ pack, p }) => {
                    const sorted = p.known + p.learn;
                    const pct = (n: number) => (p.total ? (n / p.total) * 100 : 0);
                    return (
                      <li key={pack.id} className="grid gap-1">
                        <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                          <span className="font-medium">
                            <span aria-hidden>{pack.emoji}</span> {pack.title[locale]}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {t("listSorted", { sorted: fmt.number(sorted), total: fmt.number(p.total) })}
                          </span>
                        </div>
                        {/* Already know, then Should learn; what is left to sort stays empty. */}
                        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div className="h-full bg-primary" style={{ width: `${pct(p.known)}%` }} />
                          <div className="h-full bg-primary/40" style={{ width: `${pct(p.learn)}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {t("listParts", {
                            known: fmt.number(p.known),
                            learn: fmt.number(p.learn),
                            left: fmt.number(p.left),
                          })}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div>
              <Link href="/my-words/" className={buttonVariants({ variant: "outline" })}>
                {t("openMyWords")}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <YouCard />
    </div>
  );
}
