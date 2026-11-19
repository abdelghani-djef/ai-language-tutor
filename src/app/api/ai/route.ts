import { handleAiRequest } from "@/lib/server/handler";

// The site's only server code: AI stories and translations through Groq, with the key kept
// here (GROQ_API_KEY). The contract is in src/lib/ai-api.ts; the logic in src/lib/server/.

// Node, never cached or prerendered: every answer depends on the request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Worst case for one story: 2 attempts, each trying the primary then the fallback model,
// every call capped at 25 s (src/lib/server/groq.ts) — 100 s, plus headroom.
export const maxDuration = 120;

export function POST(request: Request): Promise<Response> {
  return handleAiRequest(request);
}
