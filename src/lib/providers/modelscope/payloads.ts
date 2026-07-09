import type { ConversationRequest, ImageGenerationRequest } from '../../contracts';
import {
  resolveAigcOptionalFields,
  resolveOutputLimitPayload,
  resolveThinkingPayload,
  toWireMessages,
} from '../../domain';
import { OUTPUT_LIMIT_TIERS } from '../../config/limits';

/**
 * ModelScope payload construction — the only place where domain requests
 * are translated into ModelScope wire formats. Provider-specific fields
 * (enable_thinking, chat_template_kwargs, thinking.type, X-ModelScope-*)
 * must never appear outside this layer.
 */

export const MODELSCOPE_BASE_URL = 'https://api-inference.modelscope.cn/v1';

export type ModelScopeChatPayload = {
  model: string;
  messages: unknown[];
  stream: true;
  max_tokens?: number;
  max_completion_tokens?: number;
  enable_thinking?: boolean;
  chat_template_kwargs?: { enable_thinking: boolean };
  thinking?: { type: 'enabled' | 'disabled' };
};

/**
 * Build the Chat Completions payload.
 * Required: model, messages. Product-shape: stream (fixed true).
 * Behavior params only appear when explicitly resolved by domain rules.
 */
export function buildConversationPayload(request: ConversationRequest): ModelScopeChatPayload {
  const payload: ModelScopeChatPayload = {
    model: request.model,
    messages: toWireMessages(request.messages),
    stream: true,
  };

  Object.assign(payload, resolveThinkingPayload(request.thinking));
  Object.assign(payload, resolveOutputLimitPayload(request.outputLimit, OUTPUT_LIMIT_TIERS));

  return payload;
}

export type ModelScopeImagePayload = {
  model: string;
  prompt: string;
  negative_prompt?: string;
  size?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  image_url?: string | string[];
  loras?: string | Record<string, number>;
};

/**
 * Build the images/generations payload.
 * Required: model, prompt. Every optional field passes the explicit-params
 * filter — disabled or absent values never enter the payload.
 */
export function buildImageGenerationPayload(
  request: ImageGenerationRequest
): ModelScopeImagePayload {
  return {
    model: request.model,
    prompt: request.prompt,
    ...resolveAigcOptionalFields(request),
  };
}
