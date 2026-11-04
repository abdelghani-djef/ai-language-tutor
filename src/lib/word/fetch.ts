/**
 * JSON from the free word sources, kept in the Cache API (never localStorage, which holds the
 * learner's own data). Works without `caches` (older browsers, tests) by going to the network.
 */

const CACHE_NAME = "linguacards-words";
/** When a cached answer was stored, in ms since 1970. */
const STORED_AT = "x-linguacards-stored-at";
const TIMEOUT_MS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Entries stored longer ago than this are deleted (no source keeps answers longer). */
const PRUNE_AFTER_DAYS = 30;
let pruned = false;

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === "undefined" ? null : await caches.open(CACHE_NAME);
  } catch {
    return null; // e.g. blocked storage or an insecure page
  }
}

/** Deletes the old entries, at most once per page load. Never throws; a failure just leaves them. */
function pruneOnce(cache: Cache): void {
  if (pruned) return;
  pruned = true;
  (async () => {
    const cutoff = Date.now() - PRUNE_AFTER_DAYS * DAY_MS;
    for (const req of await cache.keys()) {
      const hit = await cache.match(req);
      if (hit && Number(hit.headers.get(STORED_AT) ?? 0) < cutoff) await cache.delete(req);
    }
  })().catch(() => {});
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Cache first, network second. Resolves with the JSON on a 2xx answer, and with null on a 404 (the
 * source has nothing for this URL). Rejects when the source couldn't be asked or gave a broken answer
 * (offline, timeout, any other non-2xx, a body that is not JSON), so the page can tell "nothing here"
 * from "couldn't load" — unless an old cached answer exists: that is returned instead.
 */
export async function fetchJson<T>(url: string, maxAgeDays = 30): Promise<T | null> {
  const cache = await openCache();
  let stale: Response | undefined;
  if (cache) {
    try {
      const hit = await cache.match(url);
      if (hit) {
        const age = Date.now() - Number(hit.headers.get(STORED_AT) ?? 0);
        if (age < maxAgeDays * DAY_MS) {
          const json = await readJson<T>(hit);
          if (json !== null) return json;
        } else {
          stale = hit;
        }
      }
    } catch {
      // A broken cache entry is just a miss.
    }
  }

  try {
    const signal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
    // Other sites skip the browser's own HTTP cache: Datamuse echoes the page's origin without
    // Vary: Origin, so a reply kept there can fail CORS later. The Cache API copy above is the cache.
    const init: RequestInit = /^https?:/.test(url) ? { signal, cache: "no-store" } : { signal };
    const res = await fetch(url, init);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const json = JSON.parse(text) as T;
    if (cache) {
      const stored = new Response(text, { headers: { "content-type": "application/json", [STORED_AT]: String(Date.now()) } });
      cache.put(url, stored).catch(() => {});
      pruneOnce(cache);
    }
    return json;
  } catch (err) {
    // Offline or the source is down: an old answer is better than none.
    const old = stale ? await readJson<T>(stale) : null;
    if (old !== null) return old;
    throw err;
  }
}
