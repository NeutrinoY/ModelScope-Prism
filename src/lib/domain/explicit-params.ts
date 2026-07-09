import type {
  ImageGenerationRequest,
  OutputLimitParam,
  OutputLimitRequest,
  ThinkingFormat,
  ThinkingRequestControl,
} from '../contracts';
import { IMAGE_PARAM_RANGES } from '../contracts';
import { toAigcImageUrlPayload } from './image-input';
import { toLoraPayload } from './lora';

/**
 * Explicit parameter sending rules — the single place that decides whether
 * an optional model behavior parameter enters the request payload
 * (docs/rebuild/00 global rule, enforced at the domain/provider boundary).
 *
 * Auto means: send nothing. UI defaults are never request defaults.
 * When in doubt, do not send.
 */

// ---------------------------------------------------------------------------
// Thinking
// ---------------------------------------------------------------------------

export type ThinkingPayloadFields = {
  enable_thinking?: boolean;
  chat_template_kwargs?: { enable_thinking: boolean };
  thinking?: { type: 'enabled' | 'disabled' };
};

/**
 * Resolve thinking control into provider payload fields.
 * mode=auto (or missing format) -> {} — nothing is sent.
 * Exactly one format is ever emitted.
 */
export function resolveThinkingPayload(
  control: ThinkingRequestControl | undefined
): ThinkingPayloadFields {
  if (!control || control.mode === 'auto') return {};

  const format: ThinkingFormat = control.format ?? 'enable_thinking';
  const enabled = control.mode === 'on';

  switch (format) {
    case 'enable_thinking':
      return { enable_thinking: enabled };
    case 'chat_template_kwargs.enable_thinking':
      return { chat_template_kwargs: { enable_thinking: enabled } };
    case 'thinking.type':
      return { thinking: { type: enabled ? 'enabled' : 'disabled' } };
  }
}

// ---------------------------------------------------------------------------
// Output limit
// ---------------------------------------------------------------------------

export type OutputLimitPayloadFields = {
  max_tokens?: number;
  max_completion_tokens?: number;
};

export type OutputLimitTierValues = {
  standard: number;
  high: number;
};

/**
 * Resolve output limit into provider payload fields.
 * enabled=false -> {} — nothing is sent.
 */
export function resolveOutputLimitPayload(
  request: OutputLimitRequest | undefined,
  tiers: OutputLimitTierValues
): OutputLimitPayloadFields {
  if (!request?.enabled) return {};

  const value = request.mode === 'high' ? tiers.high : tiers.standard;
  const param: OutputLimitParam = request.param ?? 'max_tokens';

  if (param === 'max_completion_tokens') {
    return { max_completion_tokens: value };
  }
  return { max_tokens: value };
}

// ---------------------------------------------------------------------------
// AIGC optional parameter filtering
// ---------------------------------------------------------------------------

export type AigcOptionalFields = {
  negative_prompt?: string;
  size?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  image_url?: string | string[];
  loras?: string | Record<string, number>;
};

/**
 * Filter an ImageGenerationRequest down to the optional fields the user
 * explicitly provided or enabled. Disabled values never pass through,
 * even when a value is present.
 */
export function resolveAigcOptionalFields(request: ImageGenerationRequest): AigcOptionalFields {
  const fields: AigcOptionalFields = {};

  const negativePrompt = request.negativePrompt?.trim();
  if (negativePrompt) {
    fields.negative_prompt = negativePrompt;
  }

  if (request.size?.enabled && request.size.value.trim()) {
    fields.size = request.size.value.trim();
  }

  const advanced = request.advanced;
  if (advanced?.seed?.enabled) {
    fields.seed = advanced.seed.value;
  }
  if (advanced?.steps?.enabled) {
    fields.steps = advanced.steps.value;
  }
  if (advanced?.guidance?.enabled) {
    fields.guidance = advanced.guidance.value;
  }

  const imageUrl = toAigcImageUrlPayload(request.imageInput);
  if (imageUrl !== undefined) {
    fields.image_url = imageUrl;
  }

  const loras = toLoraPayload(advanced?.loras);
  if (loras !== undefined) {
    fields.loras = loras;
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Size format validation (basic; model-specific ranges are upstream concerns)
// ---------------------------------------------------------------------------

const SIZE_PATTERN = /^(\d{2,5})x(\d{2,5})$/;

export function isValidSizeFormat(value: string): boolean {
  const match = SIZE_PATTERN.exec(value.trim());
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  // Widest documented bound across model families: [64, 2048].
  // Model-specific narrower ranges are reported by the upstream.
  return width >= 64 && width <= 2048 && height >= 64 && height <= 2048;
}

export function isValidPromptLength(value: string): boolean {
  return value.length > 0 && value.length <= IMAGE_PARAM_RANGES.promptMaxLength;
}
