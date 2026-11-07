// The learner's profile: helpers kept apart from the store so pages and tests
// can use them without loading it.

import type { Locale } from "./i18n";
import type { Flashcard, LearnerLang } from "./store";

export const MAX_NAME = 30;

/**
 * A name fit to show: spaces trimmed and collapsed, control and direction-override
 * characters dropped, at most 30 characters (code points, so a letter outside the
 * basic range isn't cut in half). Nothing left → undefined.
 */
export function cleanName(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  const name = s
    // Line breaks and tabs become spaces; other control characters go.
    .replace(/[\p{Cc}‪-‮⁦-⁩]/gu, (c) => (/\s/u.test(c) ? " " : ""))
    .replace(/\s+/gu, " ")
    .trim();
  // At most MAX_NAME code points, cut between characters as people see them,
  // so an emoji made of several code points (👍🏽, 👨‍👩‍👧) isn't split.
  const chars =
    typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name), (s) => s.segment)
      : Array.from(name);
  let cut = "";
  let points = 0;
  for (const c of chars) {
    points += Array.from(c).length;
    if (points > MAX_NAME) break;
    cut += c;
  }
  cut = cut.trim();
  return cut || undefined;
}

/**
 * The learner's language to offer first on the setup page: the one most of their
 * English words are translated into, else the ready-made lists' saved language,
 * else the interface language, else French. A tie goes down the same fallbacks.
 */
export function guessLang(cards: Flashcard[], starterPref: string | null, locale: Locale): LearnerLang {
  const count = { fr: 0, ar: 0 };
  for (const c of cards) if (c.src === "en" && isLearnerLang(c.tgt)) count[c.tgt] += 1;
  if (count.fr !== count.ar) return count.fr > count.ar ? "fr" : "ar";
  if (isLearnerLang(starterPref)) return starterPref;
  if (isLearnerLang(locale)) return locale;
  return "fr";
}

const isLearnerLang = (v: unknown): v is LearnerLang => v === "fr" || v === "ar";

/**
 * Where to go after setup: a path on this site only. Anything that could reach
 * another site ("//host", "scheme://", a backslash, a control character) or come
 * back to setup gives null.
 */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/start")) return null;
  if (next.includes("://") || next.includes("\\") || /[\p{Cc}\s]/u.test(next)) return null;
  return next;
}

/** Pages a learner with no words yet still goes to after setup: they pick, sort or add words. */
const FIRST_USE_PAGES = ["/words", "/sort", "/add"];

/**
 * Where setup leads. A learner who already has words goes where they were
 * headed (My words if nowhere); a new one goes straight to picking lists,
 * unless they were already on their way to pick, sort or add words.
 */
export function afterSetup(next: string | null, hasWords: boolean): string {
  const safe = safeNext(next);
  if (hasWords) return safe ?? "/my-words/";
  if (!safe) return "/words/";
  const path = safe.split(/[?#]/)[0];
  return FIRST_USE_PAGES.some((p) => path === p || path.startsWith(p + "/")) ? safe : "/words/";
}

/** Pages that need the learner's language: opening one before setup goes to setup first. */
export const GATED: readonly string[] = ["/my-words", "/words", "/sort", "/add", "/study", "/quiz", "/story", "/stats"];

/** Whether `pathname` is a gated page: "/study", "/study/" or "/study/x", but not "/studying". */
export function isGated(pathname: string): boolean {
  return GATED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
