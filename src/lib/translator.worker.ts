/// <reference lib="webworker" />
import { pipeline, type TranslationPipeline } from '@huggingface/transformers';

// Runs Transformers.js off the main thread so the UI stays responsive while a
// model downloads (once, then cached by the browser) and generates text.

export type WorkerRequest = { id: number; model: string; text: string; srcLang?: string; tgtLang?: string };
export type WorkerResponse =
  // Download progress belongs to a model, not a request: several requests can wait on one download.
  | { type: 'progress'; model: string; loaded: number; total: number }
  | { id: number; type: 'ready' }
  | { id: number; type: 'result'; text: string }
  | { id: number; type: 'error'; message: string };

const pipelines = new Map<string, Promise<TranslationPipeline>>();

function getPipeline(model: string): Promise<TranslationPipeline> {
  let p = pipelines.get(model);
  if (!p) {
    p = pipeline('translation', model, {
      dtype: 'q8',
      progress_callback: (e: { status: string; loaded?: number; total?: number }) => {
        // progress_total covers every file of the model, so it only moves forward.
        if (e.status === 'progress_total' && e.total) {
          post({ type: 'progress', model, loaded: e.loaded ?? 0, total: e.total });
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

// Lines longer than this are split into sentences so they aren't cut off by the
// generation limit. Shorter lines are kept whole: the sentence splitter breaks
// after abbreviations such as "Mr." and would split one sentence in two.
const MAX_LINE = 300;

/** Pieces to translate, grouped by input line so line breaks can be restored. */
function segments(text: string): string[][] {
  const seg = new Intl.Segmenter(undefined, { granularity: 'sentence' });
  return text.split('\n').map((raw) => {
    const line = raw.trim();
    if (!line) return [];
    if (line.length <= MAX_LINE) return [line];
    return [...seg.segment(line)].map((s) => s.segment.trim()).filter(Boolean);
  });
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { id, model, text, srcLang, tgtLang } = data;
  try {
    const translator = await getPipeline(model);
    post({ id, type: 'ready' });
    const options = { max_new_tokens: 256, ...(srcLang && tgtLang ? { src_lang: srcLang, tgt_lang: tgtLang } : {}) };
    const lines: string[] = [];
    // One piece at a time: batched generation pads short rows and can append junk to them.
    for (const pieces of segments(text)) {
      const done: string[] = [];
      for (const piece of pieces) {
        const out = (await translator(piece, options)) as { translation_text: string }[];
        done.push(out[0].translation_text);
      }
      lines.push(done.join(' '));
    }
    const result = lines.join('\n');
    post({ id, type: 'result', text: result });
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
