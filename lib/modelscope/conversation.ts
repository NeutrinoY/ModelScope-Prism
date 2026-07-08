import OpenAI from 'openai';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import {
  assertModelSupportsMessages,
  buildModelScopeChatPayload,
  getModelProfile,
  hasThinkingParam,
  type ConversationMessage,
  type ModelScopeChatPayload,
  type ThinkingIntent,
} from '@/lib/model-capabilities';

const MODELSCOPE_BASE_URL = 'https://api-inference.modelscope.cn/v1';

type StreamDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
};

type StreamNotice = {
  code: string;
  message: string;
};

export type ModelScopeConversationOptions = {
  apiKey: string;
  model: string;
  messages: ConversationMessage[];
  thinkingIntent: ThinkingIntent;
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

function toNdjsonNotice(notice: StreamNotice): string {
  return `${JSON.stringify({ n: notice.message, code: notice.code })}\n`;
}

function isRejectedThinkingParamError(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  if (error.status !== 400 && error.status !== 422) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('thinking') ||
    message.includes('enable_thinking') ||
    message.includes('chat_template') ||
    message.includes('unknown') ||
    message.includes('invalid') ||
    message.includes('extra') ||
    message.includes('field') ||
    message.includes('parameter')
  );
}

async function createUpstream(
  client: OpenAI,
  payload: ModelScopeChatPayload,
  options: ModelScopeConversationOptions
) {
  return client.chat.completions.create(payload, {
    timeout: options.timeoutMs,
    signal: options.signal,
  });
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
    thinkingIntent: options.thinkingIntent,
    maxTokens:
      profile.output.maxTokenParam === 'none' ? undefined : profile.output.defaultMaxTokens,
  });

  // ModelScope exposes OpenAI-compatible chat completions, but thinking controls remain
  // provider-specific passthrough fields described by the local model capability profile.
  let notices: StreamNotice[] = [];
  let upstream: Awaited<ReturnType<typeof createUpstream>>;
  try {
    upstream = await createUpstream(client, payload, options);
  } catch (error) {
    const canFallback =
      profile.source === 'custom' &&
      hasThinkingParam(payload) &&
      isRejectedThinkingParamError(error);

    if (!canFallback) throw error;

    const fallbackPayload = buildModelScopeChatPayload({
      model: options.model,
      messages: options.messages,
      thinkingIntent: 'auto',
      maxTokens:
        profile.output.maxTokenParam === 'none' ? undefined : profile.output.defaultMaxTokens,
    });
    upstream = await createUpstream(client, fallbackPayload, options);
    notices = [
      {
        code: 'THINKING_PARAM_FALLBACK',
        message:
          'The custom model rejected the thinking control parameter, so Prism retried with the model default.',
      },
    ];
  }
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const notice of notices) {
          controller.enqueue(encoder.encode(toNdjsonNotice(notice)));
        }
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
