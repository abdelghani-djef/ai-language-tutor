/** Lowercase, drop accents/diacritics (incl. Arabic harakat), punctuation and extra spaces. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export type Verdict = "correct" | "close" | "wrong";

/** Exact match after normalizing is correct; one typo per ~6 letters counts as "close". */
export function checkAnswer(given: string, expected: string): Verdict {
  const g = normalizeAnswer(given);
  const e = normalizeAnswer(expected);
  if (!g) return "wrong";
  if (g === e) return "correct";
  const allowed = Math.floor(e.length / 6);
  return allowed > 0 && levenshtein(g, e) <= allowed ? "close" : "wrong";
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The correct answer plus up to three distinct distractors, shuffled. */
export function choicesFor(answer: string, pool: readonly string[]): string[] {
  const key = normalizeAnswer(answer);
  const seen = new Set([key]);
  const distractors: string[] = [];
  for (const p of shuffle(pool)) {
    const k = normalizeAnswer(p);
    if (seen.has(k)) continue;
    seen.add(k);
    distractors.push(p);
    if (distractors.length === 3) break;
  }
  return shuffle([answer, ...distractors]);
}
