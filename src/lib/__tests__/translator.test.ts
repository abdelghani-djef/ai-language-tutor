import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_ENDPOINT, AiError } from "../ai-api";
import { cachedTranslation, clearTranslationCache, translateCached } from "../useTranslator";

const reply = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

beforeEach(() => clearTranslationCache());
afterEach(() => vi.unstubAllGlobals());

describe("translateCached", () => {
  it("asks the server once, then answers from the cache", async () => {
    const fetch = vi.fn(() => reply({ text: "chat" }));
    vi.stubGlobal("fetch", fetch);
    await expect(translateCached("cat", "en", "fr")).resolves.toBe("chat");
    await expect(translateCached("cat", "en", "fr")).resolves.toBe("chat");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual([AI_ENDPOINT, expect.objectContaining({ method: "POST" })]);
    // Another direction is another translation.
    await translateCached("cat", "en", "ar");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps each line of a several-line text, so it is found on its own", async () => {
    vi.stubGlobal("fetch", vi.fn(() => reply({ text: "Un.\nDeux." })));
    await translateCached("One.\nTwo.", "en", "fr");
    expect(cachedTranslation("Two.", "en", "fr")).toBe("Deux.");
    expect(cachedTranslation("Two.\nOne.", "en", "fr")).toBe("Deux.\nUn.");
    expect(cachedTranslation("Three.", "en", "fr")).toBeUndefined();
  });

  it("throws the server's error and caches nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => reply({ error: "busy", retryAfter: 20 }, 429)));
    const err = await translateCached("cat", "en", "fr").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err).toMatchObject({ code: "busy", retryAfter: 20 });
    expect(cachedTranslation("cat", "en", "fr")).toBeUndefined();
  });

  it("says offline when the request never reaches the server", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(translateCached("cat", "en", "fr")).rejects.toMatchObject({ code: "offline" });
  });
});
