"use client";

import { STARTER_PACKS } from "@/data/starter-packs";
import { useLocale, useT } from "@/lib/i18n";
import { OWN } from "@/lib/mywords";
import { study } from "@/messages/study";

/**
 * The name of what Study and Quiz work on: "My words", "My own words", or a
 * ready-made list's title in the interface language, read live (never saved).
 * `list` is a value already checked by `validList`.
 */
export function useListTitle(list: string | null): string {
  const t = useT(study);
  const [locale] = useLocale();
  if (list === OWN) return t("ownWords");
  const pack = list ? STARTER_PACKS.find((p) => p.id === list) : undefined;
  return pack ? pack.title[locale] : t("myWords");
}
