"use client";

import { Flame, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GoalRing } from "@/components/goal-ring";
import { LanguageMenu } from "@/components/language-menu";
import { ThemeMenu } from "@/components/theme-menu";
import { Badge } from "@/components/ui/badge";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { reviewsOn } from "@/lib/rewards";
import { studyStreak } from "@/lib/stats";
import { dueCount, useHydrated, useSaveError, useStore, useToday } from "@/lib/store";
import { cn } from "@/lib/utils";
import { common } from "@/messages/common";
import { rewards } from "@/messages/rewards";

// "My words" covers every page about your words: ready-made lists, sorting, adding words, a word's page and the old list pages.
const LINKS = [
  { href: "/my-words", label: "navDecks", also: ["/words", "/sort", "/add", "/word", "/decks", "/deck"] },
  { href: "/study", label: "navStudy" },
  { href: "/story", label: "navStories" },
  { href: "/stats", label: "navStats" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const data = useStore();
  const hydrated = useHydrated();
  const saveError = useSaveError();
  const t = useT(common);
  const tr = useT(rewards);
  const fmt = useFormat();
  const today = useToday();
  const due = dueCount(data, today);
  const streak = hydrated ? studyStreak(data.reviews.map((r) => r.day)) : 0;
  const done = hydrated ? reviewsOn(data, today) : 0;
  const goal = data.settings.dailyGoal;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      {/* On phones the nav gets its own row under the logo and controls, so every link fits. */}
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:h-14 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0">
        {/* The brand name stays in Latin letters in every language. */}
        <Link href="/" dir="ltr" className="font-display text-xl font-semibold tracking-tight">
          Lingua<span className="text-primary">Cards</span>
        </Link>
        <nav aria-label={t("mainNav")} className="order-last flex basis-full items-center gap-1 overflow-x-auto sm:order-none sm:flex-1 sm:basis-auto">
          {LINKS.map((l) => {
            const active =
              pathname.startsWith(`${l.href}/`) ||
              pathname === l.href ||
              ("also" in l && l.also.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                {t(l.label)}
                {l.href === "/study" && hydrated && due > 0 && <Badge className="h-5 px-1.5">{fmt.number(due)}</Badge>}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/stats#goal"
          className="ms-auto flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium tabular-nums hover:bg-muted sm:ms-0"
          title={tr("goalRing", { done, count: goal })}
          aria-label={tr("goalRing", { done, count: goal })}
        >
          <GoalRing done={done} goal={goal} />
          <span className="hidden sm:inline">
            {fmt.number(Math.min(done, goal))}/{fmt.number(goal)}
          </span>
        </Link>
        <span className="flex items-center gap-1 text-sm font-medium tabular-nums" title={t("streakTitle")}>
          <Flame className={cn("size-4", streak > 0 ? "text-orange-500" : "text-muted-foreground")} aria-hidden />
          <span aria-hidden>{fmt.number(streak)}</span>
          <span className="sr-only">{t("streakLabel", { count: streak })}</span>
        </span>
        <div className="flex items-center">
          <LanguageMenu />
          <ThemeMenu />
        </div>
      </div>
      {saveError && (
        <div role="alert" className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          <TriangleAlert className="me-1.5 inline size-4 align-text-bottom" />
          {t("saveError", { error: saveError })}
        </div>
      )}
    </header>
  );
}
