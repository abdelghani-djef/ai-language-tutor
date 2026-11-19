import type { AiErrorBody, AiErrorCode } from "../ai-api";
import { anonymousId, clientIp, createLimiters, isAllowedOrigin } from "./guard";
import { writeStory } from "./story";
import { translateText } from "./translate";
import { parseAiRequest, readBody } from "./validate";

// POST /api/ai/ from start to finish, kept out of the route file so tests can run it with a
// fake fetch, environment and clock. Checks go cheapest first, and nothing reaches Groq until
// the request has passed all of them.

const STATUS: Record<AiErrorCode, number> = {
  bad_request: 400,
  forbidden: 403,
  busy: 429,
  unsafe: 422,
  upstream: 502,
  not_configured: 503,
};

// Answers are per visitor and per request: never cache them anywhere.
const NO_STORE = { "Cache-Control": "no-store" };

export function errorResponse(error: AiErrorCode, retryAfter?: number): Response {
  const body: AiErrorBody = retryAfter ? { error, retryAfter } : { error };
  const headers: Record<string, string> = { ...NO_STORE };
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  return Response.json(body, { status: STATUS[error], headers });
}

export type HandlerDeps = {
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  now?: () => number;
  limiters?: ReturnType<typeof createLimiters>;
};

// One set per server instance; see RateLimiter for why that is good enough here.
const sharedLimiters = createLimiters();

export async function handleAiRequest(request: Request, deps: HandlerDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const limiters = deps.limiters ?? sharedLimiters;

  if (!isAllowedOrigin(request.headers, env.ALLOWED_ORIGINS)) return errorResponse("forbidden");

  // JSON only. This also means a page on another site cannot send the request without a CORS
  // preflight, which this route does not answer.
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") return errorResponse("bad_request");

  const text = await readBody(request);
  if (text === null) return errorResponse("bad_request");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return errorResponse("bad_request");
  }
  const req = parseAiRequest(raw);
  if (!req) return errorResponse("bad_request");

  const apiKey = env.GROQ_API_KEY?.trim();
  if (!apiKey) return errorResponse("not_configured");

  const ip = clientIp(request.headers);
  const wait = limiters[req.task].hit(ip, deps.now?.());
  if (wait) return errorResponse("busy", wait);

  const groq = { apiKey, fetch: deps.fetch, signal: request.signal };
  const user = anonymousId(ip);

  if (req.task === "story") {
    const result = await writeStory(req, user, groq);
    return result.ok ? Response.json(result.story, { headers: NO_STORE }) : errorResponse(result.error, result.retryAfter);
  }
  const result = await translateText(req, user, groq);
  return result.ok ? Response.json({ text: result.text }, { headers: NO_STORE }) : errorResponse(result.error, result.retryAfter);
}
