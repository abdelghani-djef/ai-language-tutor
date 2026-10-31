/**
 * Lowercase, drop Latin accents, Arabic harakat and tatweel, punctuation and extra spaces.
 * Other combining marks are kept: in Hindi or Japanese they change the word.
 */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
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

/**
 * Exact match after normalizing is correct; one typo per ~6 letters counts as "close".
 * `expected` may list several acceptable answers (the same word saved on more than one card).
 */
export function checkAnswer(given: string, expected: string | readonly string[]): Verdict {
  const g = normalizeAnswer(given);
  if (!g) return "wrong";
  let best: Verdict = "wrong";
  for (const answer of typeof expected === "string" ? [expected] : expected) {
    const e = normalizeAnswer(answer);
    if (g === e) return "correct";
    const allowed = Math.floor(e.length / 6);
    if (allowed > 0 && levenshtein(g, e) <= allowed) best = "close";
  }
  return best;
}

/** How many different answers a list holds once case, accents and punctuation are ignored. */
export function distinctCount(answers: readonly string[]): number {
  return new Set(answers.map(normalizeAnswer)).size;
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
