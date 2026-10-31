"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerRequest, WorkerResponse } from './translator.worker';

export type TranslatorStatus = 'idle' | 'loading' | 'translating' | 'error';

let worker: Worker | null = null;
function getWorker(): Worker {
  worker ??= new Worker(new URL("./translator.worker.ts", import.meta.url), { type: 'module' });
  return worker;
}

export function useTranslator() {
  const [status, setStatus] = useState<TranslatorStatus>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const files = useRef(new Map<string, { loaded: number; total: number }>());

  useEffect(() => () => void reqId.current++, []);

  const translate = useCallback((text: string, model: string): Promise<string | null> => {
    const id = ++reqId.current;
    const w = getWorker();
    files.current.clear();
    setError(null);
    setStatus('translating');
    setProgress(null);

    return new Promise((resolve) => {
      const onMessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (data.id !== id) return;
        if (data.type === 'progress') {
          files.current.set(data.file, { loaded: data.loaded, total: data.total });
          let loaded = 0;
          let total = 0;
          for (const f of files.current.values()) {
            loaded += f.loaded;
            total += f.total;
          }
          setStatus('loading');
          setProgress(total ? loaded / total : null);
          return;
        }
        if (data.type === 'loading') return;
        w.removeEventListener('message', onMessage);
        if (id !== reqId.current) return resolve(null);
        setProgress(null);
        if (data.type === 'result') {
          setStatus('idle');
          resolve(data.text);
        } else {
          setStatus('error');
          setError(data.message);
          resolve(null);
        }
      };
      w.addEventListener('message', onMessage);
      w.postMessage({ id, model, text } satisfies WorkerRequest);
    });
  }, []);

  return { translate, status, progress, error };
}
