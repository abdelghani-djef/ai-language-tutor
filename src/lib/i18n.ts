"use client";

import { createElement, Fragment, useMemo, type ReactNode } from "react";
import { usePref } from "./store";

// Interface translations. Each screen keeps its strings in src/messages/<name>.ts
// with an English, French and Arabic version; useT() picks the current one.

export type Locale = "en" | "fr" | "ar";

export const LOCALES: Record<Locale, { name: string; dir: "ltr" | "rtl"; intl: string }> = {
  en: { name: "English", dir: "ltr", intl: "en" },
  fr: { name: "Français", dir: "ltr", intl: "fr" },
  // Western digits, as used in the Maghreb and alongside card text in other scripts.
  ar: { name: "العربية", dir: "rtl", intl: "ar-u-nu-latn" },
};

export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
export const LOCALE_KEY = "linguacards:locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && v in LOCALES;
}

/** The first browser language we have a translation for, else English. */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

/** The interface language. The server render and first client render are always English. */
export function useLocale(): [Locale, (l: Locale) => void] {
  const [value, setValue] = usePref(LOCALE_KEY, "en");
  return [isLocale(value) ? value : "en", setValue];
}

/**
 * A message is a string with {name} placeholders, or plural forms picked with
 * Intl.PluralRules from the `count` variable (Arabic uses zero/one/two/few/many).
 */
export type Plural = { other: string } & Partial<Record<Exclude<Intl.LDMLPluralRule, "other">, string>>;
export type Message = string | Plural;
export type Messages<K extends string> = Record<Locale, Record<K, Message>>;

/** Type-checks that French and Arabic have exactly the English keys. */
export function defineMessages<K extends string>(m: {
  en: Record<K, Message>;
  fr: Record<NoInfer<K>, Message>;
  ar: Record<NoInfer<K>, Message>;
}): Messages<K> {
  return m;
}

export type Vars = Record<string, string | number>;

export interface Translate<K extends string> {
  (key: K, vars?: Vars): string;
  /** Like t(), but placeholders can be elements, e.g. a link inside a sentence. */
  rich(key: K, vars: Record<string, ReactNode>): ReactNode;
  locale: Locale;
}

export function translator<K extends string>(messages: Messages<K>, locale: Locale): Translate<K> {
  const dict = messages[locale];
  const intl = LOCALES[locale].intl;
  const rules = new Intl.PluralRules(intl);
  const numbers = new Intl.NumberFormat(intl);

  const pick = (key: K, count: unknown): string => {
    const m = dict[key] ?? messages.en[key];
    if (typeof m === "string") return m;
    const n = typeof count === "number" ? count : 0;
    return m[rules.select(n)] ?? m.other;
  };

  const t = ((key: K, vars?: Vars) =>
    pick(key, vars?.count).replace(/\{(\w+)\}/g, (whole, name: string) => {
      const v = vars?.[name];
      if (v === undefined) return whole;
      return typeof v === "number" ? numbers.format(v) : v;
    })) as Translate<K>;

  t.rich = (key, vars) => {
    const parts = pick(key, vars.count).split(/\{(\w+)\}/g);
    // split() puts captured placeholder names at odd indexes.
    return parts.map((p, i) => createElement(Fragment, { key: i }, i % 2 ? (vars[p] ?? `{${p}}`) : p));
  };
  t.locale = locale;
  return t;
}

export function useT<K extends string>(messages: Messages<K>): Translate<K> {
  const [locale] = useLocale();
  return useMemo(() => translator(messages, locale), [messages, locale]);
}
