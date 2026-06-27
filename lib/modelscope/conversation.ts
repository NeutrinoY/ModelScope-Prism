import OpenAI from 'openai';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import {
  assertModelSupportsMessages,
  buildModelScopeChatPayload,
  getModelProfile,
  type ConversationMessage,
} from '@/lib/model-capabilities';

const MODELSCOPE_BASE_URL = 'https://api-inference.modelscope.cn/v1';

type StreamDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
};

export type ModelScopeConversationOptions = {
  apiKey: string;
  model: string;
  messages: ConversationMessage[];
  enableThinking: boolean;
  timeoutMs: number;
  signal?: AbortSignal;
};

function createClient(apiKey: string, timeoutMs: number): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: MODELSCOPE_BASE_URL,
    timeout: timeoutMs,
    maxRetries: 0,
  });
}

function toNdjsonChunk(chunk: ChatCompletionChunk): string {
  const delta = chunk.choices[0]?.delta as StreamDelta | undefined;
  if (!delta) return '';

  const reasoning = delta.reasoning_content ?? delta.reasoning ?? '';
  const content = delta.content ?? '';
  if (!reasoning && !content) return '';

  return `${JSON.stringify({ r: reasoning, c: content })}\n`;
}

export async function createModelScopeConversationStream(
  options: ModelScopeConversationOptions
): Promise<ReadableStream<Uint8Array>> {
  const profile = getModelProfile(options.model);
  assertModelSupportsMessages(profile, options.messages);

  const client = createClient(options.apiKey, options.timeoutMs);
  const payload = buildModelScopeChatPayload({
    model: options.model,
    messages: options.messages,
    enableThinking: options.enableThinking,
    maxTokens: profile.modalities.includes('image') ? 4096 : undefined,
  });

  // ModelScope exposes OpenAI-compatible chat completions, but thinking controls remain
  // provider-specific passthrough fields described by the local model capability profile.
  const upstream = await client.chat.completions.create(payload, {
    timeout: options.timeoutMs,
    signal: options.signal,
  });
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of upstream) {
          const data = toNdjsonChunk(chunk);
          if (data) controller.enqueue(encoder.encode(data));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
