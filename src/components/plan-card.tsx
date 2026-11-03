"use client";

import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { type RewardKey } from "@/components/celebrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { ROUTINES } from "@/lib/rewards";
import { setPlan, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { rewards } from "@/messages/rewards";

// Anchoring practice to a moment you already have, as an if-then plan, helps
// habits form (Gollwitzer & Sheeran 2006).
const MINUTES = [5, 10, 15];

/** Shows the learner's if-then study plan, or a form to make one. */
export function PlanCard({ className }: { className?: string }) {
  const { settings } = useStore();
  const t = useT(rewards);
  const plan = settings.plan;
  const [editing, setEditing] = useState(false);
  const [routine, setRoutine] = useState<string>(plan?.routine ?? "home");
  const [minutes, setMinutes] = useState(plan?.minutes ?? 5);
  const routineLabel = (r: string) => t(`routine.${r}` as RewardKey);

  const routineItems = ROUTINES.map((r) => ({ value: r, label: routineLabel(r) }));
  const minuteItems = MINUTES.map((m) => ({ value: String(m), label: t("planMinutesOption", { count: m }) }));

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="size-5 text-primary" aria-hidden /> {t("planTitle")}
        </CardTitle>
        {(!plan || editing) && <CardDescription>{t("planIntro")}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-3">
        {plan && !editing ? (
          <>
            <p className="font-display text-xl">
              {t("planSentence", { routine: routineLabel(plan.routine), count: plan.minutes })}
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRoutine(plan.routine);
                  setMinutes(plan.minutes);
                  setEditing(true);
                }}
              >
                {t("planEdit")}
              </Button>
            </div>
          </>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPlan({ routine, minutes });
              setEditing(false);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{t("planWhen")}</span>
                <Select items={routineItems} value={routine} onValueChange={(v) => v && setRoutine(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {routineItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{t("planMinutes")}</span>
                <Select items={minuteItems} value={String(minutes)} onValueChange={(v) => v && setMinutes(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <p className="text-sm">{t("planSentence", { routine: routineLabel(routine), count: minutes })}</p>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {t("planSave")}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  {t("planCancel")}
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
