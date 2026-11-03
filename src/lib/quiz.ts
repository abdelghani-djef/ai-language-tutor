/**
 * Lowercase, drop Latin accents, Arabic harakat and tatweel, punctuation and extra spaces.
 * Other combining marks are kept: in Hindi or Japanese they change the word.
 */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "")
    .normalize("NFC")
    // Arabic letters people commonly write either way: ى/ي, ة/ه, and hamza forms of alif.
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[أإآ]/g, "ا")
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

// Leading words a learner may reasonably leave out: articles, "to" before verbs.
const OPTIONAL_LEAD = /^(the|a|an|to|le|la|les|l'|l’|un|une|des|el|los|las|der|die|das|il|lo|gli)\s+|^(l'|l’)/i;

/** Splits "a / b, c" into its alternatives, but not at commas inside brackets. */
function alternatives(expected: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of expected) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && /[/;,،]/.test(ch)) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((p) => p.trim()).filter(Boolean);
}

/**
 * Every form of an answer that counts as right: the answer itself; each
 * alternative written "a / b", "a, b" or "a; b"; each without notes in brackets
 * ("loin (de)" → "loin") and with both forms of a gender ending ("désolé(e)" →
 * "désolé", "désolée"); each without a leading article; and Arabic words with
 * and without the article "ال".
 */
export function acceptedAnswers(expected: string): string[] {
  const out = new Set<string>();
  const add = (v: string) => {
    const p = v.replace(/\s+/g, " ").trim();
    if (!p) return;
    out.add(p);
    const bare = p.replace(OPTIONAL_LEAD, "").trim();
    if (bare) out.add(bare);
    if (/^ال\p{L}/u.test(bare)) out.add(bare.slice(2));
    else if (/^\p{Script=Arabic}/u.test(bare)) out.add(`ال${bare}`);
  };
  for (const part of [expected, ...alternatives(expected)]) {
    add(part);
    // A gender ending in brackets: both the plain and the feminine form are right.
    const gender = part.match(/^(.*\p{L})\((e|es|ne|le|se|te)\)$/u);
    if (gender) {
      add(gender[1]);
      add(gender[1] + gender[2]);
    }
    add(part.replace(/\s*\([^)]*\)/g, ""));
  }
  return [...out];
}

/** The accepted answer closest to what was typed, to show the right spelling against. */
export function closestAnswer(given: string, accepted: readonly string[]): string {
  const g = normalizeAnswer(given);
  let best = accepted[0] ?? "";
  let bestDistance = Infinity;
  for (const a of accepted) {
    const d = levenshtein(g, normalizeAnswer(a));
    if (d < bestDistance) {
      best = a;
      bestDistance = d;
    }
  }
  return best;
}

export type DiffPart = { text: string; kind: "same" | "missing" | "extra" };

/**
 * A letter-by-letter comparison of what was typed with the right answer, for
 * showing exactly what to fix. Case and accents still count here: the point is
 * to show the correct spelling.
 */
export function answerDiff(given: string, expected: string): DiffPart[] {
  // Compare whole letters (graphemes), so Arabic harakat and accents stay on their letter.
  const graphemes = (x: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(x)].map((g) => g.segment);
  const a = graphemes(given);
  const b = graphemes(expected);
  // Longest common subsequence table, compared case-insensitively.
  const eq = (x: string, y: string) => x.toLocaleLowerCase() === y.toLocaleLowerCase();
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = eq(a[i], b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (text: string, kind: DiffPart["kind"]) => {
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += text;
    else parts.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && eq(a[i], b[j])) {
      push(b[j], "same");
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      push(b[j], "missing");
      j++;
    } else {
      push(a[i], "extra");
      i++;
    }
  }
  return parts;
}
