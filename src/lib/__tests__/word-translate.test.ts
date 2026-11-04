import { afterEach, describe, expect, it, vi } from "vitest";
import { isModelCached, translatorFor } from "../word/translate";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("translatorFor", () => {
  it("uses Opus-MT for English to a supported language", () => {
    expect(translatorFor("en", "fr")?.model).toBe("Xenova/opus-mt-en-fr");
    expect(translatorFor("en", "ar")?.model).toBe("Xenova/opus-mt-en-ar");
  });

  it("uses Opus-MT for a supported language to English", () => {
    expect(translatorFor("fr", "en")?.model).toBe("Xenova/opus-mt-fr-en");
  });

  it("returns null when there is no Opus model, never falling back to NLLB", () => {
    expect(translatorFor("es", "de")).toBeNull();
    expect(translatorFor("en", "ja")).toBeNull();
  });
});

describe("isModelCached", () => {
  it("resolves false when the Cache Storage API is missing", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(isModelCached("x")).resolves.toBe(false);
  });

  it("is true when a cached request URL contains the model name", async () => {
    const cache = {
      keys: async () => [
        new Request("https://huggingface.co/Xenova/opus-mt-en-fr/resolve/main/config.json"),
      ],
    };
    vi.stubGlobal("caches", { has: async () => true, open: async () => cache });
    await expect(isModelCached("Xenova/opus-mt-en-fr")).resolves.toBe(true);
    await expect(isModelCached("Xenova/opus-mt-en-ar")).resolves.toBe(false);
  });

  it("is false when opening the cache throws", async () => {
    vi.stubGlobal("caches", {
      has: async () => true,
      open: async () => {
        throw new Error("denied");
      },
    });
    await expect(isModelCached("x")).resolves.toBe(false);
  });
});
