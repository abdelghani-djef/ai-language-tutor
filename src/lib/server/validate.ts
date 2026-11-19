import { AI_LIMITS, type AiRequest } from "../ai-api";
import { LANGUAGE_CODES } from "../languages";
import { isCleanSentence } from "../word/clean";

// Checks a request body against the contract in ai-api.ts. Anything unexpected is refused:
// the endpoint spends a shared free allowance, so it only does exactly what the app asks for.

/** Largest body accepted, in bytes. A full request (20 words, or 500 characters in any script) fits easily. */
export const MAX_BODY_BYTES = 4096;

// Same rule as isStoryWord in ai-story.ts: letters, spaces, hyphens and apostrophes.
const STORY_WORD = /^[\p{L}\p{M}' ’-]+$/u;

const isLang = (v: unknown): v is string => typeof v === "string" && LANGUAGE_CODES.includes(v);

const hasOnlyKeys = (o: object, keys: string[]) => Object.keys(o).every((k) => keys.includes(k));

/**
 * The body as text, or null when it is larger than `max` bytes. Reads the stream itself so a
 * missing or false Content-Length cannot make the server buffer a large body.
 */
export async function readBody(request: Request, max = MAX_BODY_BYTES): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * The request in a clean form, or null when it breaks the contract. Story words are trimmed and
 * de-duplicated; words that fail the child-safety filter are dropped rather than failing the whole
 * story (a learner may have such a card), and the story is refused only when none is left.
 * Translation text has its line breaks normalised and control characters removed.
 */
export function parseAiRequest(raw: unknown): AiRequest | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;

  if (body.task === "story") {
    if (!hasOnlyKeys(body, ["task", "words", "lang"])) return null;
    const { words, lang } = body;
    if (!isLang(lang) || lang === "en") return null;
    if (!Array.isArray(words) || words.length < 1 || words.length > AI_LIMITS.maxStoryWords) return null;
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const w of words) {
      if (typeof w !== "string") return null;
      const trimmed = w.normalize("NFC").trim();
      // Checked before spaces are collapsed, so line breaks and tabs are refused, not hidden.
      if (!trimmed || trimmed.length > AI_LIMITS.maxWordLength || !STORY_WORD.test(trimmed) || !/\p{L}/u.test(trimmed)) return null;
      const word = trimmed.replace(/ +/g, " ");
      const key = word.toLowerCase();
      if (seen.has(key) || !isCleanSentence(word)) continue;
      seen.add(key);
      clean.push(word);
    }
    return clean.length ? { task: "story", words: clean, lang } : null;
  }

  if (body.task === "translate") {
    if (!hasOnlyKeys(body, ["task", "text", "from", "to"])) return null;
    const { text, from, to } = body;
    if (!isLang(from) || !isLang(to) || from === to) return null;
    if (typeof text !== "string" || text.length > AI_LIMITS.maxTranslateChars) return null;
    const normalised = text
      .normalize("NFC")
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, " ")
      // Other control characters have no place in a word or a sentence.
      .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "");
    if (!normalised.trim()) return null;
    return { task: "translate", text: normalised, from, to };
  }

  return null;
}
