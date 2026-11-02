"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { confetti } from "@/lib/confetti";
import { useT, type Translate } from "@/lib/i18n";
import { BADGES } from "@/lib/rewards";
import { onReward } from "@/lib/store";
import { rewards } from "@/messages/rewards";

export type RewardKey = Parameters<Translate<keyof (typeof rewards)["en"]>>[0];

/** A badge's translated name or description. */
export function badgeText(t: Translate<RewardKey>, id: string, part: "name" | "desc"): string {
  return t(`${id}.${part}` as RewardKey);
}

/** Confetti and a toast when a badge is earned or the daily goal is reached. */
export function Celebrations() {
  const t = useT(rewards);

  useEffect(
    () =>
      onReward(({ badges, goal }) => {
        confetti();
        if (goal) toast.success(t("goalReachedToast"), { description: t("goalReachedHint") });
        if (badges.length === 1) {
          const b = BADGES.find((x) => x.id === badges[0]);
          toast(t("badgeToast", { name: `${b?.icon ?? ""} ${badgeText(t, badges[0], "name")}` }), {
            description: badgeText(t, badges[0], "desc"),
          });
        } else if (badges.length > 1) {
          toast(t("badgesToast", { count: badges.length }), {
            description: badges
              .map((id) => `${BADGES.find((x) => x.id === id)?.icon ?? ""} ${badgeText(t, id, "name")}`)
              .join(" · "),
          });
        }
      }),
    [t],
  );

  return null;
}
