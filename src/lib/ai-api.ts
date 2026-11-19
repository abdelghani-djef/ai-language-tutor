// The contract between the app and its one server endpoint, POST /api/ai/, which calls Groq
// with the key kept on the server. The endpoint only does these two jobs: it never forwards
// free text to the model as a prompt. Shared by the route (src/app/api/ai/route.ts) and the
// browser (aiStory / aiTranslate below), so both sides agree on shapes and limits.

/** Where the app calls the endpoint. trailingSlash is on, so the route lives at /api/ai/. */
export const AI_ENDPOINT = "/api/ai/";

/** Limits the server enforces (and the client respects before sending). */
export const AI_LIMITS = {
  /** A story is written from at most this many words. */
  maxStoryWords: 20,
  /** Each story word: letters, spaces, hyphens and apostrophes only, at most this long. */
  maxWordLength: 40,
  /** Text sent for translation, in characters. */
  maxTranslateChars: 500,
} as const;

export type StoryRequest = {
  task: "story";
  /** The learner's words, English. 1 to AI_LIMITS.maxStoryWords. */
  words: string[];
  /** The learner's language code (from LANGUAGE_CODES, never "en"): the sentence translations are in it. */
  lang: string;
};

export type TranslateRequest = {
  task: "translate";
  /** At most AI_LIMITS.maxTranslateChars. May hold several lines; each line is translated on its own line. */
  text: string;
  /** Language codes from LANGUAGE_CODES, different from each other. */
  from: string;
  to: string;
};

export type AiRequest = StoryRequest | TranslateRequest;

export type StorySentence = {
  /** One English sentence of the story. */
  en: string;
  /** Its translation in the learner's language. */
  tr: string;
};

/**
 * 200 for task "story". The title and every English sentence passed the child-safety filter on
 * the server; the translations did too when lang is "fr" (the filter has no list for other languages).
 */
export type StoryResponse = { title: string; sentences: StorySentence[] };

/** 200 for task "translate". Same number of lines as the request's text. */
export type TranslateResponse = { text: string };

/**
 * Error bodies, with their HTTP status:
 * - 400 "bad_request": the body broke the contract (shape, sizes, languages).
 * - 403 "forbidden": the request did not come from this site (Origin check).
 * - 429 "busy": too many requests, from this visitor or for the shared free allowance.
 *   `retryAfter` is in seconds when known.
 * - 422 "unsafe": the model wrote something that failed the child-safety filter twice.
 * - 502 "upstream": the model service failed or answered with something unusable.
 * - 503 "not_configured": the server has no API key.
 */
export type AiErrorCode = "bad_request" | "forbidden" | "busy" | "unsafe" | "upstream" | "not_configured";
export type AiErrorBody = { error: AiErrorCode; retryAfter?: number };

/** Thrown by aiStory / aiTranslate. "offline" when the request never reached the server. */
export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode | "offline",
    readonly retryAfter?: number,
  ) {
    super(code);
    this.name = "AiError";
  }
}

async function post<T>(body: AiRequest, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new AiError("offline");
  }
  const data = (await response.json().catch(() => null)) as T | AiErrorBody | null;
  if (!response.ok || data === null) {
    const error = data as AiErrorBody | null;
    throw new AiError(error?.error ?? "upstream", error?.retryAfter);
  }
  return data as T;
}

/** Writes a story from the learner's words. Throws AiError, or an AbortError when `signal` aborts. */
export function aiStory(words: string[], lang: string, signal?: AbortSignal): Promise<StoryResponse> {
  return post<StoryResponse>({ task: "story", words, lang }, signal);
}

/** Translates text line by line. Throws AiError, or an AbortError when `signal` aborts. */
export async function aiTranslate(text: string, from: string, to: string, signal?: AbortSignal): Promise<string> {
  return (await post<TranslateResponse>({ task: "translate", text, from, to }, signal)).text;
}
