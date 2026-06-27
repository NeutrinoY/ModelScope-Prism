'use client';

import { useCallback } from 'react';

type StreamDelta = {
  c?: string;
  r?: string;
};

type ReadNdjsonOptions = {
  allowPlainTextFallback?: boolean;
  onDelta: (delta: StreamDelta) => void;
  onPlainText?: (text: string) => void;
};

export function useNdjsonStream() {
  const readNdjsonStream = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>, options: ReadNdjsonOptions) => {
      const decoder = new TextDecoder();
      let buffer = '';

      const emitPlainText = (text: string) => {
        if (!options.allowPlainTextFallback) return;
        if (!text) return;
        options.onPlainText?.(text);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed) as StreamDelta;
            if (parsed.c || parsed.r) {
              options.onDelta(parsed);
            }
          } catch {
            emitPlainText(line);
          }
        }
      }

      const finalChunk = buffer.trim();
      if (!finalChunk) return;

      try {
        const parsed = JSON.parse(finalChunk) as StreamDelta;
        if (parsed.c || parsed.r) {
          options.onDelta(parsed);
        }
      } catch {
        emitPlainText(buffer);
      }
    },
    []
  );

  return { readNdjsonStream };
}
