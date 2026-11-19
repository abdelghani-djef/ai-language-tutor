"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AI_LIMITS, AiError, aiTranslate } from "./ai-api";

export type TranslatorStatus = "idle" | "translating" | "error";
/** Why translating failed; "too_long" is caught here, before anything is sent. */
export type TranslatorError = { code: AiError["code"] | "too_long"; retryAfter?: number };

// Translations already made in this tab, so the same text costs no second request of the
// shared free allowance. Key: from|to|text. Lines of a several-line text are kept one by one
// too, so a text translated as part of a batch is found on its own.
const cache = new Map<string, string>();
const keyOf = (text: string, from: string, to: string) => `${from}|${to}|${text}`;

/** The translation of `text` if this tab has already made it, without asking the server. */
export function cachedTranslation(text: string, from: string, to: string): string | undefined {
  const whole = cache.get(keyOf(text, from, to));
  if (whole !== undefined || !text.includes("\n")) return whole;
  const lines = text.split("\n").map((line) => cache.get(keyOf(line, from, to)));
  return lines.every((l) => l !== undefined) ? lines.join("\n") : undefined;
}

function remember(text: string, from: string, to: string, result: string) {
  cache.set(keyOf(text, from, to), result);
  const lines = text.split("\n");
  const translated = result.split("\n");
  if (lines.length > 1 && lines.length === translated.length) {
    lines.forEach((line, i) => cache.set(keyOf(line, from, to), translated[i]));
  }
}

/** The translation from this tab's cache, or else from the server. Throws like aiTranslate. */
export async function translateCached(text: string, from: string, to: string, signal?: AbortSignal): Promise<string> {
  const known = cachedTranslation(text, from, to);
  if (known !== undefined) return known;
  const result = await aiTranslate(text, from, to, signal);
  remember(text, from, to, result);
  return result;
}

/** Only for tests. */
export function clearTranslationCache() {
  cache.clear();
}

/**
 * Translates through the app's server (POST /api/ai/). The latest request wins: an earlier one
 * still running is aborted and resolves null, as do requests still running on unmount.
 */
export function useTranslator() {
  const [status, setStatus] = useState<TranslatorStatus>("idle");
  const [error, setError] = useState<TranslatorError | null>(null);
  const running = useRef<AbortController | null>(null);

  useEffect(() => () => running.current?.abort(), []);

  const translate = useCallback(async (text: string, from: string, to: string): Promise<string | null> => {
    running.current?.abort();
    running.current = null;
    setError(null);
    if (!text.trim() || from === to) {
      setStatus("idle");
      return null;
    }
    const known = cachedTranslation(text, from, to);
    if (known !== undefined) {
      // Known already: no request, and no "Translating…" flash.
      setStatus("idle");
      return known;
    }
    if (text.length > AI_LIMITS.maxTranslateChars) {
      setStatus("error");
      setError({ code: "too_long" });
      return null;
    }

    const controller = new AbortController();
    running.current = controller;
    setStatus("translating");
    try {
      const result = await translateCached(text, from, to, controller.signal);
      if (controller.signal.aborted) return null;
      setStatus("idle");
      return result;
    } catch (err) {
      if (controller.signal.aborted) return null;
      setStatus("error");
      setError(err instanceof AiError ? { code: err.code, retryAfter: err.retryAfter } : { code: "upstream" });
      return null;
    } finally {
      if (running.current === controller) running.current = null;
    }
  }, []);

  /** Hides a past error, e.g. once the word it was about has changed. */
  const clearError = useCallback(() => {
    setError(null);
    setStatus((s) => (s === "error" ? "idle" : s));
  }, []);

  return { translate, status, error, clearError };
}
