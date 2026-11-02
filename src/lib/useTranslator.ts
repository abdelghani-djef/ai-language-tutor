"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModelChoice } from './languages';
import type { WorkerRequest, WorkerResponse } from './translator.worker';

export type TranslatorStatus = 'idle' | 'loading' | 'translating' | 'error';
/** "crashed" when the worker died without saying why; the page shows its own message for it. */
export type TranslatorError = { code: 'crashed' } | { code: 'failed'; message: string };

// One worker for the whole app, so a downloaded model stays loaded across pages.
// Request ids are global too: a page that mounts again must not reuse an id
// that an earlier, still-running request has.
let worker: Worker | null = null;
let nextId = 0;
/** Called with an error if the worker itself dies, so no request waits forever. */
const pending = new Set<(error: TranslatorError) => void>();

function getWorker(): Worker {
  if (!worker) {
    const w = new Worker(new URL("./translator.worker.ts", import.meta.url), { type: 'module' });
    const fail = (e: Event) => {
      w.terminate();
      if (worker === w) worker = null;
      const error: TranslatorError =
        e instanceof ErrorEvent && e.message ? { code: 'failed', message: e.message } : { code: 'crashed' };
      for (const reject of [...pending]) reject(error);
    };
    w.addEventListener('error', fail);
    w.addEventListener('messageerror', fail);
    worker = w;
  }
  return worker;
}

export function useTranslator() {
  const [status, setStatus] = useState<TranslatorStatus>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<TranslatorError | null>(null);
  /** The id of this component's latest request; older results are dropped. -1 once unmounted. */
  const latest = useRef(0);

  useEffect(() => () => void (latest.current = -1), []);

  const translate = useCallback((text: string, choice: ModelChoice): Promise<string | null> => {
    const id = ++nextId;
    latest.current = id;
    const w = getWorker();
    setError(null);
    setStatus('translating');
    setProgress(null);

    return new Promise((resolve) => {
      const isLatest = () => latest.current === id;
      const finish = (result: string | null, failure?: TranslatorError) => {
        w.removeEventListener('message', onMessage);
        pending.delete(onCrash);
        if (!isLatest()) return resolve(null);
        setProgress(null);
        if (failure === undefined) {
          setStatus('idle');
        } else {
          setStatus('error');
          setError(failure);
        }
        resolve(result);
      };
      const onCrash = (failure: TranslatorError) => finish(null, failure);
      const onMessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (data.type === 'progress') {
          if (data.model === choice.model && isLatest()) {
            setStatus('loading');
            setProgress(data.loaded / data.total);
          }
          return;
        }
        if (data.id !== id) return;
        if (data.type === 'ready') {
          if (isLatest()) {
            setStatus('translating');
            setProgress(null);
          }
        } else if (data.type === 'result') {
          finish(data.text);
        } else {
          finish(null, { code: 'failed', message: data.message });
        }
      };
      pending.add(onCrash);
      w.addEventListener('message', onMessage);
      w.postMessage({ id, text, ...choice } satisfies WorkerRequest);
    });
  }, []);

  /** Hides a past error, e.g. once the word it was about has changed. */
  const clearError = useCallback(() => {
    setError(null);
    setStatus((s) => (s === 'error' ? 'idle' : s));
  }, []);

  return { translate, status, progress, error, clearError };
}
