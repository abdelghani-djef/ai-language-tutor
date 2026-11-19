// Calls Groq's OpenAI-compatible chat API. Only the server uses this: the key never leaves it.
// Model choices and parameters come from Groq's docs (checked 2026-11-14); see
// https://console.groq.com/docs/models and /docs/deprecations before changing them.

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** How long one Groq call may take before it counts as failed. */
export const GROQ_TIMEOUT_MS = 25_000;

export type ModelSpec = {
  id: string;
  /** gpt-oss accepts low/medium/high (it cannot switch reasoning off); Qwen 3.8 accepts "none". */
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** gpt-oss only: drop the reasoning text from the reply (it is still generated and counted). */
  hideReasoning?: boolean;
  /** Room for the reasoning tokens too, or the JSON gets cut off. */
  maxTokens: number;
};

// Each task has a primary model and one fallback with its own daily quota (quotas are per model).
// Strict JSON schema output is supported by all four.
export const STORY_MODELS: ModelSpec[] = [
  { id: "openai/gpt-oss-120b", reasoningEffort: "low", hideReasoning: true, maxTokens: 2048 },
  // Preview model: Groq may retire it at short notice, which then fails over like a 404.
  { id: "qwen/qwen3.8-27b", reasoningEffort: "none", maxTokens: 2048 },
];

export const TRANSLATE_MODELS: ModelSpec[] = [
  // No reasoning tokens, so many more short translations fit in the daily token allowance.
  { id: "qwen/qwen3.8-27b", reasoningEffort: "none", maxTokens: 600 },
  { id: "openai/gpt-oss-20b", reasoningEffort: "low", hideReasoning: true, maxTokens: 1024 },
];

export type ChatMessage = { role: "system" | "user"; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  /** JSON schema the reply must follow (strict mode: every property required, no extra ones). */
  schema: { name: string; schema: Record<string, unknown> };
  temperature: number;
  topP: number;
  /** Opaque visitor id for Groq's abuse monitoring; never personal data. */
  user: string;
};

export type GroqDeps = {
  apiKey: string;
  fetch?: typeof fetch;
  /** Aborts the Groq call when the visitor goes away. */
  signal?: AbortSignal;
};

/** Why a Groq call gave nothing usable. "busy" carries Groq's retry-after in seconds when it sent one. */
export class GroqFailure extends Error {
  constructor(
    readonly kind: "busy" | "upstream",
    readonly retryAfter?: number,
  ) {
    super(kind);
    this.name = "GroqFailure";
  }
}

export type ChatReply = {
  /** The reply's text (a JSON string when a schema was given), or null if it had none. */
  content: string | null;
  /** "length" means the token limit cut the reply off. */
  finishReason: string | null;
  /** Index in the model list of the model that answered, so a retry starts from it. */
  modelIndex: number;
};

export function chatBody(model: ModelSpec, req: ChatRequest): Record<string, unknown> {
  return {
    model: model.id,
    messages: req.messages,
    temperature: req.temperature,
    top_p: req.topP,
    max_completion_tokens: model.maxTokens,
    ...(model.reasoningEffort ? { reasoning_effort: model.reasoningEffort } : {}),
    ...(model.hideReasoning ? { include_reasoning: false } : {}),
    stream: false,
    user: req.user,
    response_format: {
      type: "json_schema",
      json_schema: { name: req.schema.name, strict: true, schema: req.schema.schema },
    },
  };
}

function retryAfterSeconds(response: Response): number | undefined {
  const value = Number(response.headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined;
}

type GroqErrorBody = { error?: { code?: unknown; message?: unknown } } | null;

/** True when the model is gone or unknown, so the fallback model should answer instead. */
function modelGone(status: number, body: GroqErrorBody): boolean {
  if (status === 404) return true;
  const code = typeof body?.error?.code === "string" ? body.error.code : "";
  return code === "model_decommissioned" || code === "model_not_found";
}

/**
 * Sends the request to `models[start]`, moving once to the next model when Groq is rate limited
 * (quotas are per model), the model is gone, or Groq has a server error. Throws GroqFailure.
 */
export async function groqChat(models: ModelSpec[], req: ChatRequest, deps: GroqDeps, start = 0): Promise<ChatReply> {
  const doFetch = deps.fetch ?? fetch;
  let busyWait: number | undefined;
  let busy = false;

  for (let i = start; i < models.length; i++) {
    const model = models[i];
    const timeout = AbortSignal.timeout(GROQ_TIMEOUT_MS);
    let response: Response;
    try {
      response = await doFetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${deps.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(chatBody(model, req)),
        signal: deps.signal ? AbortSignal.any([timeout, deps.signal]) : timeout,
      });
    } catch {
      // Timeout or network failure. Not retried: the visitor has already waited long enough.
      console.warn(`[ai] groq ${model.id}: no response`);
      throw new GroqFailure("upstream");
    }

    if (response.ok) {
      const data = (await response.json().catch(() => null)) as {
        id?: string;
        x_groq?: { id?: string };
        choices?: { message?: { content?: unknown }; finish_reason?: unknown }[];
      } | null;
      const choice = data?.choices?.[0];
      const content = typeof choice?.message?.content === "string" ? choice.message.content : null;
      const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : null;
      return { content, finishReason, modelIndex: i };
    }

    const body = (await response.json().catch(() => null)) as GroqErrorBody;
    const requestId = response.headers.get("x-request-id") ?? "";
    console.warn(`[ai] groq ${model.id}: HTTP ${response.status} ${requestId}`.trim());

    if (response.status === 429) {
      busy = true;
      const wait = retryAfterSeconds(response);
      // The visitor can try again as soon as any of the models frees up.
      if (wait !== undefined) busyWait = busyWait === undefined ? wait : Math.min(busyWait, wait);
      continue;
    }
    if (modelGone(response.status, body) || response.status >= 500) continue;
    // 400/401/403/413/422 and the like: the request or the key is wrong; another model will not help.
    throw new GroqFailure("upstream");
  }

  throw busy ? new GroqFailure("busy", busyWait) : new GroqFailure("upstream");
}
