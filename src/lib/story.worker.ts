/// <reference lib="webworker" />
import { InterruptableStoppingCriteria, pipeline, type TextGenerationPipeline } from '@huggingface/transformers';
import type { ChatMessage } from './ai-story';
import { hasWebGPU, STORY_MODEL, STORY_MODEL_DTYPE } from './story-model';

// Runs the story model off the main thread so the UI stays responsive while it
// downloads (once, then cached by the browser) and writes text. WebGPU only.

export type WorkerRequest =
  | { type: 'generate'; id: number; messages: ChatMessage[]; maxNewTokens: number }
  | { type: 'cancel'; id: number };
export type WorkerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { id: number; type: 'ready' }
  | { id: number; type: 'result'; text: string }
  | { id: number; type: 'error'; message: string };

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}

let loading: Promise<TextGenerationPipeline> | null = null;

function getPipeline(): Promise<TextGenerationPipeline> {
  if (!loading) {
    loading = (async () => {
      // WebGPU only: on WASM every quantized export fails (GatherBlockQuantized has no WASM kernel).
      if (!(await hasWebGPU())) throw new Error('WebGPU with shader-f16 is not available');
      return (await pipeline('text-generation', STORY_MODEL, {
        device: 'webgpu',
        dtype: STORY_MODEL_DTYPE,
        progress_callback: (e: { status: string; loaded?: number; total?: number }) => {
          // progress_total covers every file of the model, so it only moves forward.
          if (e.status === 'progress_total' && e.total) post({ type: 'progress', loaded: e.loaded ?? 0, total: e.total });
        },
      })) as unknown as TextGenerationPipeline;
    })();
    loading.catch(() => (loading = null));
  }
  return loading;
}

const stopping = new InterruptableStoppingCriteria();
let running: number | null = null;
/** Ids asked for and not yet finished; a cancel for any other id is ignored. */
const active = new Set<number>();
/** Ids cancelled before their turn or while the model was loading: they must not run. */
const cancelled = new Set<number>();
/** Requests run one at a time: two generations never share the pipeline or `stopping`. */
let queue: Promise<void> = Promise.resolve();

async function generateOne(id: number, messages: ChatMessage[], maxNewTokens: number) {
  try {
    if (cancelled.has(id)) return;
    const generator = await getPipeline();
    // Cancelled while queued or while the model loaded: the hook already resolved null.
    if (cancelled.has(id)) return;
    post({ id, type: 'ready' });
    running = id;
    stopping.reset();
    const out = (await generator(messages, {
      max_new_tokens: maxNewTokens,
      do_sample: true,
      temperature: 0.7,
      top_k: 20,
      top_p: 0.95,
      repetition_penalty: 1.1,
      tokenizer_encode_kwargs: { enable_thinking: false },
      stopping_criteria: stopping,
    })) as { generated_text: { content: string }[] }[];
    post({ id, type: 'result', text: out[0].generated_text.at(-1)?.content ?? '' });
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  } finally {
    if (running === id) running = null;
    active.delete(id);
    cancelled.delete(id);
  }
}

self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === 'cancel') {
    if (!active.has(data.id)) return;
    cancelled.add(data.id);
    if (running === data.id) stopping.interrupt();
    return;
  }
  active.add(data.id);
  queue = queue.then(() => generateOne(data.id, data.messages, data.maxNewTokens));
};
