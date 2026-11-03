"use client";

import { GoalRing } from "@/components/goal-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { GOAL_OPTIONS, NEW_PER_DAY_OPTIONS, reviewsOn } from "@/lib/rewards";
import { setDailyGoal, setNewPerDay, useStore, useToday } from "@/lib/store";
import { rewards } from "@/messages/rewards";

export function GoalCard() {
  const data = useStore();
  const t = useT(rewards);
  const goal = data.settings.dailyGoal;
  const today = useToday();
  const done = reviewsOn(data, today);
  // Keep a goal restored from a backup selectable even if it isn't a preset.
  const options = GOAL_OPTIONS.includes(goal) ? GOAL_OPTIONS : [...GOAL_OPTIONS, goal].sort((a, b) => a - b);
  const items = options.map((n) => ({ value: String(n), label: t("goalOption", { count: n }) }));
  const newPerDay = data.settings.newPerDay;
  const newOptions = NEW_PER_DAY_OPTIONS.includes(newPerDay)
    ? NEW_PER_DAY_OPTIONS
    : [...NEW_PER_DAY_OPTIONS, newPerDay].sort((a, b) => a - b);
  const newItems = newOptions.map((n) => ({ value: String(n), label: t("newPerDayOption", { count: n }) }));

  return (
    <Card id="goal" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{t("goalTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-5">
        <GoalRing done={done} goal={goal} size={72} stroke={8} />
        <div className="grid flex-1 gap-1">
          <p className="font-display text-2xl font-semibold tabular-nums">{t("goalProgress", { done, count: goal })}</p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {done >= goal ? t("goalMet") : t("goalLeft", { count: goal - done })}
          </p>
          <p className="text-xs text-muted-foreground">{t("goalDays", { count: data.rewards.goalDays.length })}</p>
        </div>
        <div className="grid gap-2">
          <Select items={items} value={String(goal)} onValueChange={(v) => v && setDailyGoal(Number(v))}>
            <SelectTrigger className="w-48" aria-label={t("goalSelect")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* A cap on new words keeps daily reviews from piling up. */}
          <Select items={newItems} value={String(newPerDay)} onValueChange={(v) => v && setNewPerDay(Number(v))}>
            <SelectTrigger className="w-48" aria-label={t("newPerDay")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {newItems.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
