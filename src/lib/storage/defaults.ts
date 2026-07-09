import type {
  ConversationDefaults,
  ImageGenerationDefaults,
  ModelDefaults,
  PrismSettings,
  PrismStorageV1,
} from '../contracts';

/**
 * Default storage data (docs/rebuild/06).
 *
 * Every optional parameter defaults to the not-sent state: thinking mode
 * auto, output limit disabled, AIGC params disabled. Displayed values are
 * UI conveniences, never request defaults.
 */

export const DEFAULT_MODEL_DEFAULTS: ModelDefaults = {
  chatModelId: 'deepseek-ai/DeepSeek-V4-Flash',
  visionModelId: 'Qwen/Qwen3.5-397B-A17B',
  imageModelId: 'Qwen/Qwen-Image',
};

export const DEFAULT_CONVERSATION_DEFAULTS: ConversationDefaults = {
  thinking: { mode: 'auto' },
  outputLimit: { enabled: false, mode: 'standard' },
};

export const DEFAULT_IMAGE_DEFAULTS: ImageGenerationDefaults = {
  size: { enabled: false, value: '1024x1024' },
  negativePrompt: '',
  seed: { enabled: false, value: 0 },
  steps: { enabled: false, value: 30 },
  guidance: { enabled: false, value: 3.5 },
  loras: { items: [] },
};

export function createDefaultSettings(): PrismSettings {
  return {
    currentWorkspace: 'chat',
    modelDefaults: { ...DEFAULT_MODEL_DEFAULTS },
    conversationDefaults: structuredClone(DEFAULT_CONVERSATION_DEFAULTS),
    imageDefaults: structuredClone(DEFAULT_IMAGE_DEFAULTS),
  };
}

export function createDefaultStorage(): PrismStorageV1 {
  return {
    schemaVersion: 1,
    secrets: {},
    settings: createDefaultSettings(),
    sessions: {},
    activeSessionByWorkspace: { chat: null, vision: null, image: null },
  };
}
