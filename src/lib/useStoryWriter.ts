"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, Generate } from './ai-story';
import type { WorkerRequest, WorkerResponse } from './story.worker';
import { hasWebGPU, STORY_MODEL, STORY_MODEL_MB } from './story-model';

export { hasWebGPU, STORY_MODEL, STORY_MODEL_MB };

export type StoryWriterStatus = 'idle' | 'loading' | 'writing' | 'error';

// One worker for the whole app, so the downloaded model stays loaded. Ids are global too.
let worker: Worker | null = null;
let nextId = 0;
/** Called if the worker itself dies, so no request waits forever. */
const pending = new Set<(message: string | null) => void>();

function getWorker(): Worker {
  if (!worker) {
    const w = new Worker(new URL('./story.worker.ts', import.meta.url), { type: 'module' });
    const fail = (e: Event) => {
      w.terminate();
      if (worker === w) worker = null;
      const message = e instanceof ErrorEvent && e.message ? e.message : null;
      for (const reject of [...pending]) reject(message);
    };
    w.addEventListener('error', fail);
    w.addEventListener('messageerror', fail);
    worker = w;
  }
  return worker;
}

/**
 * Runs the story model. writeStory calls `generate` many times in a row, so cancelling is a
 * state, not an event: after `cancel()` the running `generate` resolves null and every later
 * one resolves null at once, until `reset()` starts a new run. Call `reset()` before each
 * writeStory. Unmounting cancels for good. Cancelling while the model downloads ends the download.
 */
export function useStoryWriter(): {
  generate: Generate;
  cancel(): void;
  reset(): void;
  status: StoryWriterStatus;
  progress: number | null;
  error: string | null;
} {
  const [status, setStatus] = useState<StoryWriterStatus>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);
  const unmounted = useRef(false);
  /** The running request: its id, how to resolve it with null, and whether the model is still loading for it. */
  const inflight = useRef<{ id: number; stop: () => void; loading: boolean } | null>(null);

  const cancel = useCallback(() => {
    cancelled.current = true;
    const run = inflight.current;
    if (!run) return;
    worker?.postMessage({ type: 'cancel', id: run.id } satisfies WorkerRequest);
    run.stop();
    // Stopped during the download: end the download too. The next run makes a new worker.
    if (run.loading && pending.size === 0 && worker) {
      worker.terminate();
      worker = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (unmounted.current) return;
    cancelled.current = false;
    setError(null);
    setStatus('idle');
    setProgress(null);
  }, []);

  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      cancel();
    };
  }, [cancel]);

  const generate = useCallback<Generate>((messages: ChatMessage[], maxNewTokens: number) => {
    if (cancelled.current || unmounted.current) return Promise.resolve(null);
    const id = ++nextId;
    const w = getWorker();
    setError(null);
    setStatus('writing');

    return new Promise((resolve) => {
      const entry = { id, stop: () => finish(null), loading: false };
      const finish = (result: string | null, failure?: string | null) => {
        w.removeEventListener('message', onMessage);
        pending.delete(onCrash);
        if (inflight.current?.id === id) inflight.current = null;
        if (!unmounted.current) {
          setProgress(null);
          if (failure === undefined) {
            setStatus('idle');
          } else {
            setStatus('error');
            setError(failure ?? 'crashed');
          }
        }
        resolve(cancelled.current ? null : result);
      };
      const onCrash = (message: string | null) => finish(null, message);
      const onMessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (data.type === 'progress') {
          entry.loading = true;
          if (!unmounted.current && !cancelled.current) {
            setStatus('loading');
            setProgress(data.loaded / data.total);
          }
          return;
        }
        if (data.id !== id) return;
        if (data.type === 'ready') {
          entry.loading = false;
          if (!unmounted.current && !cancelled.current) {
            setStatus('writing');
            setProgress(null);
          }
        } else if (data.type === 'result') {
          finish(data.text);
        } else {
          finish(null, data.message);
        }
      };
      inflight.current = entry;
      pending.add(onCrash);
      w.addEventListener('message', onMessage);
      w.postMessage({ type: 'generate', id, messages, maxNewTokens } satisfies WorkerRequest);
    });
  }, []);

  return { generate, cancel, reset, status, progress, error };
}
