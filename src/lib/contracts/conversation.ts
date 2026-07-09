import { z } from 'zod';

/**
 * Conversation contracts — the shared source of truth for the unified
 * LLM / VLM Conversation domain (docs/rebuild/05-interface-contract.md).
 *
 * Global rule: model behavior parameters are only sent when the user
 * explicitly selects, enables, or provides them. `stream: true` is a
 * product-shape parameter fixed at the provider adapter.
 */

export type ConversationRole = 'system' | 'developer' | 'user' | 'assistant';

export type ConversationContentPart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
      };
    };

export type TextConversationMessage = {
  role: ConversationRole;
  content: string;
  reasoning?: string;
  requestMeta?: ConversationRequestMeta;
};

export type MultimodalConversationMessage = {
  role: 'user';
  content: ConversationContentPart[];
  requestMeta?: ConversationRequestMeta;
};

export type ConversationMessage = TextConversationMessage | MultimodalConversationMessage;

export type ThinkingMode = 'auto' | 'on' | 'off';

export type ThinkingFormat =
  | 'enable_thinking'
  | 'chat_template_kwargs.enable_thinking'
  | 'thinking.type';

export type ThinkingRequestControl = {
  mode: ThinkingMode;
  format?: ThinkingFormat;
};

export type OutputLimitMode = 'standard' | 'high';

export type OutputLimitParam = 'max_tokens' | 'max_completion_tokens';

export type OutputLimitRequest = {
  enabled: boolean;
  mode: OutputLimitMode;
  param?: OutputLimitParam;
};

export type ConversationRequest = {
  model: string;
  messages: ConversationMessage[];
  apiKey?: string;
  thinking?: ThinkingRequestControl;
  outputLimit?: OutputLimitRequest;
};

export type ConversationRequestMeta = {
  modelId: string;
  thinking?: ThinkingRequestControl;
  outputLimit?: OutputLimitRequest;
  createdAt: number;
};

/**
 * Prism internal NDJSON stream event returned by /api/conversation.
 *
 * c — assistant content delta
 * r — reasoning content delta
 * n — non-fatal notice (with optional code)
 */
export type ConversationStreamEvent = {
  c?: string;
  r?: string;
  n?: string;
  code?: string;
};

// ---------------------------------------------------------------------------
// Zod schemas (runtime validation at the API boundary)
// ---------------------------------------------------------------------------

export const conversationContentPartSchema = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('image_url'),
    image_url: z.object({
      url: z.string().min(1),
    }),
  }),
]);

export const conversationMessageSchema = z.union([
  z.object({
    role: z.enum(['system', 'developer', 'user', 'assistant']),
    content: z.string(),
  }),
  z.object({
    role: z.literal('user'),
    content: z.array(conversationContentPartSchema).min(1),
  }),
]);

export const thinkingFormatSchema = z.enum([
  'enable_thinking',
  'chat_template_kwargs.enable_thinking',
  'thinking.type',
]);

export const thinkingRequestControlSchema = z.object({
  mode: z.enum(['auto', 'on', 'off']),
  format: thinkingFormatSchema.optional(),
});

export const outputLimitRequestSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['standard', 'high']),
  param: z.enum(['max_tokens', 'max_completion_tokens']).optional(),
});

export const conversationRequestSchema = z.object({
  model: z.string().min(1).max(200),
  messages: z.array(conversationMessageSchema).min(1),
  apiKey: z.string().optional(),
  thinking: thinkingRequestControlSchema.optional(),
  outputLimit: outputLimitRequestSchema.optional(),
});
