"use client";

import { useMemo } from "react";
import { LOCALES, useLocale, type Locale } from "./i18n";
import { LANGUAGES } from "./languages";
import { formatInterval } from "./srs";

/** Numbers, dates, intervals and language names in the interface language. */
export function formatter(locale: Locale) {
  const { intl, dir } = LOCALES[locale];
  const names = new Intl.DisplayNames(intl, { type: "language" });
  const numbers = new Intl.NumberFormat(intl);
  const percent = new Intl.NumberFormat(intl, { style: "percent" });

  const languageName = (code: string): string => {
    const name = names.of(code) ?? LANGUAGES[code]?.name ?? code;
    // French writes language names in lower case; they start a label here.
    return name.charAt(0).toLocaleUpperCase(intl) + name.slice(1);
  };

  return {
    /** The language name as written inside a sentence ("français", not "Français"). */
    languageNameInline: (code: string) => names.of(code) ?? LANGUAGES[code]?.name ?? code,
    locale,
    intl,
    dir,
    /** Points from the source language to the target in reading order. */
    arrow: dir === "rtl" ? "←" : "→",
    number: (n: number) => numbers.format(n),
    /** "#tag" as one left-to-right unit, so Arabic text doesn't show it as "tag#". */
    tag: (tag: string) => `\u2068#${tag}\u2069`,
    percent: (x: number) => percent.format(x),
    interval: (ms: number) => formatInterval(ms, intl),
    date: (d: Date | number, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intl, opts).format(d),
    languageName,
    pairLabel: (p: { src: string; tgt: string }) =>
      `${languageName(p.src)} ${dir === "rtl" ? "←" : "→"} ${languageName(p.tgt)}`,
  };
}

export type Format = ReturnType<typeof formatter>;

export function useFormat(): Format {
  const [locale] = useLocale();
  return useMemo(() => formatter(locale), [locale]);
}
