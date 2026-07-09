import type { ModelProfile, OutputLimitParam, ThinkingFormat } from '../contracts';

/**
 * Built-in model profiles (docs/rebuild/05 Model Profile contract).
 *
 * Built-in profiles describe known capabilities and the known control
 * formats. They inform UI hints and default visible formats only —
 * they never make Auto auto-send behavior parameters.
 *
 * Built-in models are recommendations, not permanent product contracts.
 */

const BUILTIN_PROFILES: Record<string, ModelProfile> = {
  'deepseek-ai/DeepSeek-V4-Flash': {
    id: 'deepseek-ai/DeepSeek-V4-Flash',
    label: 'DeepSeek V4 Flash',
    source: 'builtin',
    input: { text: true, imageUrl: false, imageDataUrl: false },
    thinking: {
      format: 'enable_thinking',
      canEnable: true,
      canDisable: true,
      observedByDefault: true,
    },
    output: { param: 'max_tokens', standard: 16_384, high: 65_536 },
  },
  'deepseek-ai/DeepSeek-V4-Pro': {
    id: 'deepseek-ai/DeepSeek-V4-Pro',
    label: 'DeepSeek V4 Pro',
    source: 'builtin',
    input: { text: true, imageUrl: false, imageDataUrl: false },
    thinking: {
      format: 'enable_thinking',
      canEnable: true,
      canDisable: true,
      observedByDefault: true,
    },
    output: { param: 'max_tokens', standard: 16_384, high: 65_536 },
  },
  'ZhipuAI/GLM-5.2': {
    id: 'ZhipuAI/GLM-5.2',
    label: 'GLM 5.2',
    source: 'builtin',
    input: { text: true, imageUrl: false, imageDataUrl: false },
    thinking: {
      format: 'thinking.type',
      canEnable: true,
      canDisable: true,
      observedByDefault: true,
    },
    output: { param: 'max_tokens', standard: 16_384, high: 65_536 },
  },
  'Qwen/Qwen3.5-397B-A17B': {
    id: 'Qwen/Qwen3.5-397B-A17B',
    label: 'Qwen3.5 397B A17B',
    source: 'builtin',
    input: { text: true, imageUrl: true, imageDataUrl: false },
    thinking: {
      format: 'enable_thinking',
      canEnable: true,
      canDisable: true,
      observedByDefault: true,
    },
    output: { param: 'max_tokens', standard: 16_384, high: 65_536 },
  },
};

/** Built-in conversation model list, in recommendation order. */
export const BUILTIN_CONVERSATION_MODELS: ModelProfile[] = Object.values(BUILTIN_PROFILES);

/** Recommended AIGC model IDs (entry samples, not a stable contract). */
export const RECOMMENDED_IMAGE_MODELS = [
  'Qwen/Qwen-Image',
  'MusePublic/FLUX.1-Kontext-Dev',
  'MAILAND/majicflus_v1',
] as const;

/** Default format shown when a custom model's thinking control is opened. */
export const DEFAULT_CUSTOM_THINKING_FORMAT: ThinkingFormat = 'enable_thinking';

/** Default output limit param for custom models. */
export const DEFAULT_CUSTOM_OUTPUT_PARAM: OutputLimitParam = 'max_tokens';

function createCustomProfile(modelId: string): ModelProfile {
  return {
    id: modelId,
    label: modelId.split('/').pop() || modelId,
    source: 'custom',
    input: { text: true, imageUrl: 'unknown', imageDataUrl: 'unknown' },
    thinking: {
      format: 'unknown',
      canEnable: 'unknown',
      canDisable: 'unknown',
      observedByDefault: 'unknown',
    },
    output: { param: 'unknown', standard: 16_384, high: 65_536 },
  };
}

/** Resolve a model ID to its built-in profile, or a conservative custom profile. */
export function getModelProfile(modelId: string): ModelProfile {
  return BUILTIN_PROFILES[modelId] ?? createCustomProfile(modelId);
}

export function isBuiltinModel(modelId: string): boolean {
  return modelId in BUILTIN_PROFILES;
}

/**
 * The thinking format the UI should surface for a model.
 * Built-in: the profiled format (or null when thinking is not controllable).
 * Custom: the visible default the user may switch away from.
 */
export function resolveVisibleThinkingFormat(profile: ModelProfile): ThinkingFormat | null {
  if (profile.source === 'builtin') {
    const format = profile.thinking.format;
    if (format === 'none' || format === 'native_always_on' || format === 'unknown') return null;
    return format;
  }
  return DEFAULT_CUSTOM_THINKING_FORMAT;
}

/**
 * The output-limit param a request should use when the user enables an
 * output limit. Built-in profiles may pin the param; custom models default
 * to max_tokens. Returns null when the profile says no param works.
 */
export function resolveOutputLimitParam(profile: ModelProfile): OutputLimitParam | null {
  if (profile.output.param === 'none') return null;
  if (profile.output.param === 'unknown') return DEFAULT_CUSTOM_OUTPUT_PARAM;
  return profile.output.param;
}

/** UI hint: whether image input entry points should look enabled for a model. */
export function allowsImageInput(profile: ModelProfile): {
  remoteUrl: boolean;
  dataUrl: boolean;
} {
  if (profile.source === 'custom') {
    // Custom models are allowed to try image input; the upstream decides.
    return { remoteUrl: true, dataUrl: true };
  }
  return {
    remoteUrl: profile.input.imageUrl === true,
    dataUrl: profile.input.imageDataUrl === true,
  };
}
