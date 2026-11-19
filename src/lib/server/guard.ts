import { createHash, randomBytes } from "node:crypto";

// Cheap protection for the shared free Groq allowance. None of this stops a determined
// attacker (headers can be forged outside a browser), but it keeps other sites from using the
// endpoint from their pages and keeps one visitor from spending everyone's quota.

const firstValue = (v: string | null) => v?.split(",")[0]?.trim() || null;

function originOf(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * True when the request comes from a page of this site: its Origin's host matches the host the
 * request was sent to (x-forwarded-host behind a proxy such as Vercel, else host), or the Origin is
 * listed in `allowed` (comma-separated origins, from ALLOWED_ORIGINS). Browsers always send Origin
 * on a POST, so a missing one is refused.
 */
export function isAllowedOrigin(headers: Headers, allowed?: string): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;
  const own = originOf(origin);
  if (!own) return false;
  const extra = (allowed ?? "")
    .split(",")
    .map((o) => originOf(o.trim()))
    .filter(Boolean);
  if (extra.includes(own)) return true;
  const host = firstValue(headers.get("x-forwarded-host")) ?? firstValue(headers.get("host"));
  return !!host && new URL(own).host === host.toLowerCase();
}

/** The visitor's IP as the proxy reports it, or "unknown" (all such visitors then share one budget). */
export function clientIp(headers: Headers): string {
  return firstValue(headers.get("x-forwarded-for")) ?? firstValue(headers.get("x-real-ip")) ?? "unknown";
}

// Changes on every server start, so the id sent to Groq cannot be turned back into an IP.
const SALT = randomBytes(16).toString("hex");

/** An opaque id for Groq's `user` field (abuse monitoring). Never the IP itself. */
export function anonymousId(ip: string): string {
  return createHash("sha256").update(SALT).update(ip).digest("hex").slice(0, 24);
}

export type Window = { limit: number; ms: number };

/**
 * Sliding-window limiter kept in memory. Each server instance counts on its own and forgets on
 * restart, so the limits are best effort. At most `maxKeys` visitors are tracked; the least recently
 * seen are dropped first.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private longest: number;

  constructor(
    private windows: Window[],
    private maxKeys = 10_000,
  ) {
    this.longest = Math.max(...windows.map((w) => w.ms));
  }

  /** Records a hit and returns 0, or, when a window is full, records nothing and returns the seconds to wait. */
  hit(key: string, now = Date.now()): number {
    const times = (this.hits.get(key) ?? []).filter((t) => t > now - this.longest);
    let wait = 0;
    for (const w of this.windows) {
      const inWindow = times.filter((t) => t > now - w.ms);
      if (inWindow.length >= w.limit) {
        // Free again when the oldest hit that keeps the window full leaves it.
        const oldest = inWindow[inWindow.length - w.limit];
        wait = Math.max(wait, Math.ceil((oldest + w.ms - now) / 1000));
      }
    }
    if (!wait) times.push(now);
    // Re-insert so the Map's order stays least recently seen first.
    this.hits.delete(key);
    this.hits.set(key, times);
    while (this.hits.size > this.maxKeys) {
      const stale = this.hits.keys().next().value;
      if (stale === undefined) break;
      this.hits.delete(stale);
    }
    return Math.max(wait, 0);
  }

  get size(): number {
    return this.hits.size;
  }
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Per-IP limits: stories are the expensive call (about 1.5K tokens each), translations are short. */
export const LIMITS = {
  story: [
    { limit: 5, ms: MINUTE },
    { limit: 40, ms: DAY },
  ],
  translate: [{ limit: 30, ms: MINUTE }],
} satisfies Record<string, Window[]>;

export function createLimiters() {
  return { story: new RateLimiter(LIMITS.story), translate: new RateLimiter(LIMITS.translate) };
}
