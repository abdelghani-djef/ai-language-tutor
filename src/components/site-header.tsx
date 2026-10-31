"use client";

import { Flame, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dueToday, useHydrated, useStore } from "@/lib/store";
import { studyStreak } from "@/lib/stats";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Translate" },
  { href: "/decks", label: "Decks" },
  { href: "/study", label: "Study" },
  { href: "/stats", label: "Stats" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { cards, reviews } = useStore();
  const hydrated = useHydrated();
  const { resolvedTheme, setTheme } = useTheme();
  const due = dueToday(cards).length;
  const streak = studyStreak(reviews.map((r) => r.day));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Lingua<span className="text-primary">Cards</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                {l.label}
                {l.href === "/study" && hydrated && due > 0 && <Badge className="h-5 px-1.5">{due}</Badge>}
              </Link>
            );
          })}
        </nav>
        <span
          className="flex items-center gap-1 text-sm font-medium tabular-nums"
          title="Study streak: days in a row with at least one review"
        >
          <Flame className={cn("size-4", streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
          {hydrated ? streak : 0}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle dark mode"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>
      </div>
    </header>
  );
}
