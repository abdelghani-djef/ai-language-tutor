/// <reference lib="webworker" />
import { pipeline, type TranslationPipeline } from '@huggingface/transformers';

// Runs Transformers.js off the main thread so the UI stays responsive while a
// model downloads (once, then cached by the browser) and generates text.

export type WorkerRequest = { id: number; model: string; text: string };
export type WorkerResponse =
  | { id: number; type: 'progress'; file: string; loaded: number; total: number }
  | { id: number; type: 'loading' }
  | { id: number; type: 'result'; text: string }
  | { id: number; type: 'error'; message: string };

const pipelines = new Map<string, Promise<TranslationPipeline>>();

function getPipeline(model: string, id: number): Promise<TranslationPipeline> {
  let p = pipelines.get(model);
  if (!p) {
    p = pipeline('translation', model, {
      dtype: 'q8',
      progress_callback: (e: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (e.status === 'progress' && e.file && e.total) {
          post({ id, type: 'progress', file: e.file, loaded: e.loaded ?? 0, total: e.total });
        }
      },
    }) as Promise<TranslationPipeline>;
    p.catch(() => pipelines.delete(model));
    pipelines.set(model, p);
  }
  return p;
}

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { id, model, text } = data;
  try {
    post({ id, type: 'loading' });
    const translator = await getPipeline(model, id);
    const out = await translator(text, { max_new_tokens: 256 });
    const first = (Array.isArray(out) ? out[0] : out) as { translation_text: string };
    post({ id, type: 'result', text: first.translation_text });
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
