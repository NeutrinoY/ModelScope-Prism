import OpenAI from 'openai';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import type { ConversationRequest, ConversationStreamEvent } from '../../contracts';
import { fromOpenAiError } from './errors';
import { buildConversationPayload, MODELSCOPE_BASE_URL } from './payloads';

/**
 * ModelScope Conversation provider: OpenAI-compatible Chat Completions
 * over the custom baseURL, streamed and converted to Prism NDJSON events.
 *
 * The runtime never probes and never retries with a different thinking
 * format — a rejected parameter is surfaced as a clear upstream error.
 */

export type ConversationStreamOptions = {
  apiKey: string;
  request: ConversationRequest;
  timeoutMs: number;
  signal?: AbortSignal;
};

type StreamDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
};

function toStreamEvent(chunk: ChatCompletionChunk): ConversationStreamEvent | null {
  const delta = chunk.choices[0]?.delta as StreamDelta | undefined;
  if (!delta) return null;

  const reasoning = delta.reasoning_content ?? delta.reasoning ?? '';
  const content = delta.content ?? '';
  if (!reasoning && !content) return null;

  const event: ConversationStreamEvent = {};
  if (content) event.c = content;
  if (reasoning) event.r = reasoning;
  return event;
}

/**
 * Open the upstream stream and adapt it to an NDJSON byte stream of
 * ConversationStreamEvent lines.
 */
export async function createConversationStream(
  options: ConversationStreamOptions
): Promise<ReadableStream<Uint8Array>> {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: MODELSCOPE_BASE_URL,
    timeout: options.timeoutMs,
    maxRetries: 0,
  });

  const payload = buildConversationPayload(options.request);

  let upstream: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    upstream = await client.chat.completions.create(
      payload as Parameters<typeof client.chat.completions.create>[0],
      { timeout: options.timeoutMs, signal: options.signal }
    );
  } catch (error) {
    throw fromOpenAiError(error);
  }

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of upstream as AsyncIterable<ChatCompletionChunk>) {
          const event = toStreamEvent(chunk);
          if (event) {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(fromOpenAiError(error));
      }
    },
  });
}
