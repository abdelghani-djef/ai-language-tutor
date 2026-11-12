import { getPair, modelFor, pairId, type ModelChoice } from "../languages";

/** Cache Storage name Transformers.js keeps its model files in. */
const MODEL_CACHE = "transformers-cache";

/**
 * The Opus-MT model for a direction, or null when there is none. Never NLLB:
 * it is too big to start downloading from a word page.
 */
export function translatorFor(from: string, to: string): ModelChoice | null {
  const id = pairId(from, to);
  const pair = getPair(id);
  // getPair falls back to en-fr for unknown or identical languages.
  if (pair.id !== id) return null;
  return modelFor(pair, "opus");
}

/**
 * True when the model's files are already in the browser's cache (no download needed).
 * `file` narrows it to a file name part, e.g. the weights' dtype, so a download stopped after
 * the small config files does not count.
 */
export async function isModelCached(model: string, file = ""): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    if (!(await caches.has(MODEL_CACHE))) return false;
    const cache = await caches.open(MODEL_CACHE);
    const requests = await cache.keys();
    return requests.some((request) => request.url.includes(model) && request.url.includes(file));
  } catch {
    return false;
  }
}
