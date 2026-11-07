import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { STARTER_PACKS, isAdvanced, packWords, type StarterRow } from "../../data/starter-packs";
import { STARTER_WORDS } from "../../data/starter-words";
import { highlightWords } from "../story";
import { cleanWord } from "../word/target";

type Row = StarterRow;

/** Each list from the index with its rows, so the checks below read the real words. */
const LISTS = STARTER_PACKS.map((p) => ({ ...p, words: STARTER_WORDS[p.id] ?? [] }));

/**
 * English words that are in two or more regular lists, with the lists they are in. Each means
 * something different in each list ("right": correct / on the right), so both rows stay.
 * A new word in two regular lists goes here only when its sense differs.
 */
export const ALLOWED_SHARED: ReadonlyMap<string, readonly string[]> = new Map([
  ["right", ["describe", "position"]],
  ["answer", ["school", "verbs-daily"]],
  ["cook", ["verbs-daily", "work"]],
  ["even", ["numbers", "questions"]],
  ["past", ["position", "time"]],
  ["ring", ["clothes", "verbs-daily"]],
  ["horn", ["animals", "travel"]],
  ["cream", ["body", "food"]],
  ["pass", ["school", "verbs-core"]],
  ["break", ["school", "verbs-core"]],
  ["tie", ["clothes", "verbs-daily"]],
  ["gate", ["home", "travel"]],
]);

/**
 * Rows whose example does not show the word in a form highlightWords finds, as "list:word".
 * Only today's rows may be here: they never change (learners' cards and known marks point at
 * them), so the test lets them through instead of editing them. A new row must pass.
 */
const KNOWN_EXAMPLE_EXCEPTIONS: ReadonlySet<string> = new Set([]);

/** Every row of the 20 lists as they were before part 2 added words, keyed by list id. */
const HEADS: Record<string, Row[]> = JSON.parse(
  readFileSync(join(process.cwd(), "src", "lib", "__tests__", "fixtures", "pack-heads.json"), "utf8"),
);

/** How a word is compared across rows and lists: the way packOf looks it up. */
const key = (word: string) => cleanWord(word).toLowerCase();
const regular = LISTS.filter((p) => !isAdvanced(p.id));
const advanced = LISTS.filter((p) => isAdvanced(p.id));
const allRows = LISTS.flatMap((p) => p.words.map((row) => ({ pack: p.id, row })));
const sorted = (xs: readonly string[]) => [...xs].sort();

describe("ready-made lists", () => {
  it("keeps today's rows unchanged", () => {
    for (const [id, rows] of Object.entries(HEADS)) {
      const list = LISTS.find((p) => p.id === id);
      expect(list, id).toBeDefined();
      expect(list!.words.slice(0, rows.length), id).toEqual(rows);
    }
  });

  it("every example uses its word", () => {
    for (const k of KNOWN_EXAMPLE_EXCEPTIONS) {
      const [pack, word] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)];
      expect(HEADS[pack]?.some((row) => row[0] === word), `${k} is not one of today's rows`).toBe(true);
    }
    const missing = allRows
      .filter(({ pack, row }) => !KNOWN_EXAMPLE_EXCEPTIONS.has(`${pack}:${row[0]}`))
      .filter(({ row }) => !highlightWords(row[4], [{ id: "w", word: cleanWord(row[0]) }]).some((part) => part.cardId === "w"))
      .map(({ pack, row }) => `${pack}:${row[0]} — ${row[4]}`);
    expect(missing).toEqual([]);
  });

  it("no word twice in a list", () => {
    const twice = LISTS.flatMap((p) => {
      const words = p.words.map((row) => key(row[0]));
      return words.filter((w, i) => words.indexOf(w) !== i).map((w) => `${p.id}:${w}`);
    });
    expect(twice).toEqual([]);
  });

  it("no two words in a list look the same in French or Arabic", () => {
    // Vowel marks (U+064B–U+0652, U+0670) are ignored, as a learner reading the card would.
    const look = (s: string) =>
      s.trim().toLowerCase().replace(/[ً-ْٰ]/g, "").replace(/’/g, "'");
    const same = LISTS.flatMap((p) => {
      const frozen = HEADS[p.id]?.length ?? 0;
      const out: string[] = [];
      for (const [col, lang] of [[1, "French"], [2, "Arabic"]] as const) {
        const seen = new Map<string, number>();
        p.words.forEach((row, i) => {
          const k = look(row[col]);
          const j = seen.get(k);
          // Two of today's rows may share a translation (hello / good morning = bonjour).
          if (j !== undefined && i >= frozen) out.push(`${p.id} ${lang} "${k}": ${p.words[j][0]} / ${row[0]}`);
          if (j === undefined) seen.set(k, i);
        });
      }
      return out;
    });
    expect(same).toEqual([]);
  });

  it("advanced lists never repeat a regular word", () => {
    const regularWords = new Set(regular.flatMap((p) => p.words.map((row) => key(row[0]))));
    const repeats = advanced.flatMap((p) => p.words.filter((row) => regularWords.has(key(row[0]))).map((row) => `${p.id}:${row[0]}`));
    expect(repeats).toEqual([]);
  });

  it("shared words are only the allowed ones", () => {
    const listsOf = new Map<string, string[]>();
    for (const p of regular) for (const row of p.words) listsOf.set(key(row[0]), [...(listsOf.get(key(row[0])) ?? []), p.id]);
    const shared = Object.fromEntries([...listsOf].filter(([, ids]) => ids.length > 1).map(([w, ids]) => [w, sorted(ids)]));
    const allowed = Object.fromEntries([...ALLOWED_SHARED].map(([w, ids]) => [key(w), sorted(ids)]));
    expect(shared).toEqual(allowed);
  });

  it("translations are in the right script", () => {
    const arabic = /\p{Script=Arabic}/u;
    const wrong = allRows.flatMap(({ pack, row }) => {
      const at = `${pack}:${row[0]}`;
      const out: string[] = [];
      if (!arabic.test(row[2]) || /[A-Za-z]/.test(row[2])) out.push(`${at} Arabic "${row[2]}"`);
      if (arabic.test(row[1])) out.push(`${at} French "${row[1]}"`);
      if (row[1].includes("�") || row[2].includes("�")) out.push(`${at} has a broken character`);
      return out;
    });
    expect(wrong).toEqual([]);
  });

  it("lists have the right size", () => {
    for (const p of LISTS) {
      const sizes = isAdvanced(p.id) || !HEADS[p.id] ? [100] : [HEADS[p.id].length, 100];
      expect(sizes, `${p.id} has ${p.words.length} words`).toContain(p.words.length);
    }
  });

  it("the index matches the rows", () => {
    // Same lists in the same order, and each size is its number of rows.
    expect(Object.keys(STARTER_WORDS)).toEqual(STARTER_PACKS.map((p) => p.id));
    for (const p of STARTER_PACKS) {
      expect(p.size, p.id).toBe(STARTER_WORDS[p.id].length);
      expect(packWords(STARTER_WORDS, p.id), p.id).toBe(STARTER_WORDS[p.id]);
    }
    // Titles and emoji live in the index only: the rows file is just the rows.
    for (const rows of Object.values(STARTER_WORDS)) {
      for (const row of rows) expect(row).toHaveLength(5);
    }
  });

  it("the lists' words stay light, and their index lighter still", () => {
    const gz = (name: string) => gzipSync(readFileSync(join(process.cwd(), "src", "data", name))).length;
    // The budget the words always had (they were all in starter-packs.ts before the split).
    expect(gz("starter-packs.ts") + gz("starter-words.ts")).toBeLessThanOrEqual(150 * 1024);
    // The index is in every page: titles and sizes only.
    expect(gz("starter-packs.ts")).toBeLessThanOrEqual(5 * 1024);
  });

  it("app code never imports the rows directly", () => {
    // Only the loader's dynamic import names the rows module, so no page bundles the rows.
    const files = (dir: string): string[] =>
      readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? (e.name === "__tests__" ? [] : files(`${dir}/${e.name}`)) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : [],
      );
    const uses = files("src").flatMap((path) =>
      [...readFileSync(join(process.cwd(), path), "utf8").matchAll(/(import type [^;]*?from|from|import\()\s*["'][^"']*data\/starter-words["']/g)]
        // A type-only import is erased from the bundle.
        .filter((m) => !m[1].startsWith("import type"))
        .map((m) => `${path}: ${m[1]}`),
    );
    expect(uses).toEqual(["src/lib/starter-words.ts: import("]);
  });
});
