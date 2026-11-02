"use client";

import { badgeText } from "@/components/celebrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { BADGES, metrics } from "@/lib/rewards";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { rewards } from "@/messages/rewards";

export function BadgesCard() {
  const data = useStore();
  const t = useT(rewards);
  const fmt = useFormat();
  const m = metrics(data);
  const earned = BADGES.filter((b) => b.id in data.rewards.badges).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("badgesTitle")}</CardTitle>
        <CardDescription>{t("badgesSummary", { count: earned, total: BADGES.length })}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const at = data.rewards.badges[b.id];
            const value = Math.min(m[b.metric], b.target);
            return (
              <li
                key={b.id}
                className={cn(
                  "grid justify-items-center gap-1 rounded-xl border p-3 text-center",
                  at ? "border-primary/30 bg-primary/5" : "bg-muted/40",
                )}
              >
                <span className={cn("text-3xl", !at && "opacity-40 grayscale")} aria-hidden>
                  {b.icon}
                </span>
                <span className="text-sm font-medium">{badgeText(t, b.id, "name")}</span>
                <span className="text-xs text-muted-foreground">{badgeText(t, b.id, "desc")}</span>
                {at ? (
                  <span className="text-xs font-medium text-primary">
                    {t("earnedOn", { date: fmt.date(at, { day: "numeric", month: "short", year: "numeric" }) })}
                  </span>
                ) : (
                  <span className="grid w-full gap-1">
                    <span className="sr-only">{t("locked")}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary/60"
                        style={{ width: `${(value / b.target) * 100}%` }}
                      />
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {t("progress", { value, target: b.target })}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
