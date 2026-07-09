import { z } from 'zod';
import type { PrismError } from './errors';

/**
 * AIGC image generation contracts (docs/rebuild/05-interface-contract.md).
 *
 * Minimal request semantics: model + prompt. Every optional parameter is
 * expressed with an explicit enabled/value or presence condition so that
 * UI defaults can never leak into the provider payload.
 */

export type OptionalParam<T> = {
  enabled: boolean;
  value: T;
};

export type ImageSizeRequest = {
  enabled: boolean;
  value: string;
};

export type LoraItem = {
  modelId: string;
  weight: number;
};

export type LoraRequest = {
  items: LoraItem[];
};

export type ImageInputSource = 'remote_url' | 'data_url';

export type ImageInputValue = {
  url: string;
  source: ImageInputSource;
  mimeType?: string;
};

export type ImageAdvancedRequest = {
  seed?: OptionalParam<number>;
  steps?: OptionalParam<number>;
  guidance?: OptionalParam<number>;
  loras?: LoraRequest;
};

export type ImageGenerationRequest = {
  model: string;
  prompt: string;
  negativePrompt?: string;
  size?: ImageSizeRequest;
  imageInput?: ImageInputValue[];
  advanced?: ImageAdvancedRequest;
  apiKey?: string;
};

export type ImageGenerateResponse = {
  taskId: string;
  requestId?: string;
};

export type ImageTaskStatus =
  | {
      status: 'pending' | 'running';
      taskId: string;
    }
  | {
      status: 'succeeded';
      taskId: string;
      outputImages: string[];
    }
  | {
      status: 'failed';
      taskId: string;
      error?: PrismError;
    };

export type ActiveImageTask = {
  taskId: string;
  sessionId: string;
  modelId: string;
  prompt: string;
  startedAt: number;
};

// ---------------------------------------------------------------------------
// Documented parameter ranges (docs/rebuild/03 + 05)
// ---------------------------------------------------------------------------

export const IMAGE_PARAM_RANGES = {
  promptMaxLength: 2000,
  negativePromptMaxLength: 2000,
  seed: { min: 0, max: 2_147_483_647 },
  steps: { min: 1, max: 100 },
  guidance: { min: 1.5, max: 20 },
  loraMaxCount: 6,
  loraWeightSumTarget: 1.0,
  loraWeightSumTolerance: 0.02,
} as const;

// ---------------------------------------------------------------------------
// Zod schemas (runtime validation at the API boundary)
// ---------------------------------------------------------------------------

export const imageSizeRequestSchema = z.object({
  enabled: z.boolean(),
  value: z.string().regex(/^\d{2,5}x\d{2,5}$/, 'size must be in WIDTHxHEIGHT format'),
});

export const loraItemSchema = z.object({
  modelId: z.string().min(1).max(200),
  weight: z.number().min(0).max(1),
});

export const loraRequestSchema = z.object({
  items: z.array(loraItemSchema).max(IMAGE_PARAM_RANGES.loraMaxCount),
});

export const imageInputValueSchema = z.object({
  url: z.string().min(1),
  source: z.enum(['remote_url', 'data_url']),
  mimeType: z.string().optional(),
});

export const imageAdvancedRequestSchema = z.object({
  seed: z
    .object({
      enabled: z.boolean(),
      value: z.number().int().min(IMAGE_PARAM_RANGES.seed.min).max(IMAGE_PARAM_RANGES.seed.max),
    })
    .optional(),
  steps: z
    .object({
      enabled: z.boolean(),
      value: z.number().int().min(IMAGE_PARAM_RANGES.steps.min).max(IMAGE_PARAM_RANGES.steps.max),
    })
    .optional(),
  guidance: z
    .object({
      enabled: z.boolean(),
      value: z.number().min(IMAGE_PARAM_RANGES.guidance.min).max(IMAGE_PARAM_RANGES.guidance.max),
    })
    .optional(),
  loras: loraRequestSchema.optional(),
});

export const imageGenerationRequestSchema = z.object({
  model: z.string().min(1).max(200),
  prompt: z.string().min(1).max(IMAGE_PARAM_RANGES.promptMaxLength),
  negativePrompt: z.string().max(IMAGE_PARAM_RANGES.negativePromptMaxLength).optional(),
  size: imageSizeRequestSchema.optional(),
  imageInput: z.array(imageInputValueSchema).optional(),
  advanced: imageAdvancedRequestSchema.optional(),
  apiKey: z.string().optional(),
});
