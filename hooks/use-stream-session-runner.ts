'use client';

import { useCallback, useRef, useState } from 'react';
import { useNdjsonStream } from '@/hooks/use-ndjson-stream';

type StartStreamOptions = {
  request: (signal: AbortSignal) => Promise<Response>;
  onDelta: (delta: { c?: string; r?: string }) => void;
  onPlainText?: (text: string) => void;
  allowPlainTextFallback?: boolean;
  onError?: (message: string) => void;
};

export function useStreamSessionRunner() {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { readNdjsonStream } = useNdjsonStream();

  const stop = useCallback(() => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  const start = useCallback(
    async (options: StartStreamOptions) => {
      if (isLoading) return;
      setIsLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await options.request(controller.signal);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Failed to connect to API');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No stream reader available');

        await readNdjsonStream(reader, {
          allowPlainTextFallback: options.allowPlainTextFallback,
          onDelta: options.onDelta,
          onPlainText: options.onPlainText,
        });
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          options.onError?.(error?.message || 'Request failed');
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [isLoading, readNdjsonStream]
  );

  return { isLoading, start, stop };
}
