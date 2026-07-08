import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type ModelModality = 'text' | 'image';
export type ModelProfileSource = 'builtin' | 'custom';
export type ThinkingIntent = 'auto' | 'on' | 'off';
export type ThinkingControl =
  | 'none'
  | 'root_boolean'
  | 'kwargs_dict'
  | 'thinking_object'
  | 'native_always_on';
export type OutputTokenParam = 'none' | 'max_tokens' | 'max_completion_tokens';
export type ModelAvailabilityStatus =
  | 'available'
  | 'unavailable'
  | 'auth_error'
  | 'quota_limited'
  | 'server_error'
  | 'unknown';

export type ConversationMessage = Extract<
  ChatCompletionMessageParam,
  { role: 'user' | 'assistant' | 'system' | 'developer' }
>;

export type ModelProfile = {
  id: string;
  label: string;
  provider: string;
  source: ModelProfileSource;
  modalities: ModelModality[];
  availability: {
    chat: boolean;
    stream: boolean;
    status: ModelAvailabilityStatus;
  };
  input: {
    text: boolean;
    imageUrl: boolean;
    imageDataUrl: boolean;
  };
  thinking: {
    control: ThinkingControl;
    defaultEnabled: boolean;
    canDisable: boolean;
  };
  output: {
    maxTokenParam: OutputTokenParam;
    defaultMaxTokens: number;
    highMaxTokens: number;
  };
};

const AVAILABLE_CHAT_STREAM = {
  chat: true,
  stream: true,
  status: 'available' as const,
};

const UNKNOWN_CUSTOM_AVAILABILITY = {
  chat: true,
  stream: true,
  status: 'unknown' as const,
};

const TEXT_ONLY_INPUT = {
  text: true,
  imageUrl: false,
  imageDataUrl: false,
};

const TEXT_AND_IMAGE_INPUT = {
  text: true,
  imageUrl: true,
  imageDataUrl: true,
};

export type ModelSeries = {
  key: string;
  name: string;
  provider: string;
  instruct: { id: string; strategy: ThinkingControl };
  thinking?: { id: string; strategy: ThinkingControl };
  isIdSwitch: boolean;
};

export type ModelScopeChatPayload = {
  model: string;
  messages: ChatCompletionMessageParam[];
  stream: true;
  max_tokens?: number;
  max_completion_tokens?: number;
  enable_thinking?: boolean;
  chat_template_kwargs?: {
    thinking: boolean;
    enable_thinking: boolean;
  };
  thinking?: {
    type: 'enabled' | 'disabled';
  };
};

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  'deepseek-ai/DeepSeek-V3.2': {
    id: 'deepseek-ai/DeepSeek-V3.2',
    label: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    source: 'builtin',
    modalities: ['text'],
    availability: AVAILABLE_CHAT_STREAM,
    input: TEXT_ONLY_INPUT,
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
    output: { maxTokenParam: 'none', defaultMaxTokens: 16_384, highMaxTokens: 65_536 },
  },
  'ZhipuAI/GLM-5': {
    id: 'ZhipuAI/GLM-5',
    label: 'GLM 5',
    provider: 'ZhipuAI',
    source: 'builtin',
    modalities: ['text'],
    availability: AVAILABLE_CHAT_STREAM,
    input: TEXT_ONLY_INPUT,
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
    output: { maxTokenParam: 'none', defaultMaxTokens: 16_384, highMaxTokens: 65_536 },
  },
  'MiniMax/MiniMax-M2.5': {
    id: 'MiniMax/MiniMax-M2.5',
    label: 'MiniMax M2.5',
    provider: 'MiniMax',
    source: 'builtin',
    modalities: ['text'],
    availability: AVAILABLE_CHAT_STREAM,
    input: TEXT_ONLY_INPUT,
    thinking: { control: 'native_always_on', defaultEnabled: true, canDisable: false },
    output: { maxTokenParam: 'none', defaultMaxTokens: 16_384, highMaxTokens: 65_536 },
  },
  'moonshotai/Kimi-K2.5': {
    id: 'moonshotai/Kimi-K2.5',
    label: 'Kimi K2.5',
    provider: 'Moonshot',
    source: 'builtin',
    modalities: ['text'],
    availability: AVAILABLE_CHAT_STREAM,
    input: TEXT_ONLY_INPUT,
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
    output: { maxTokenParam: 'none', defaultMaxTokens: 16_384, highMaxTokens: 65_536 },
  },
  'Qwen/Qwen3.5-397B-A17B': {
    id: 'Qwen/Qwen3.5-397B-A17B',
    label: 'Qwen3.5 397B',
    provider: 'Alibaba',
    source: 'builtin',
    modalities: ['text', 'image'],
    availability: AVAILABLE_CHAT_STREAM,
    input: TEXT_AND_IMAGE_INPUT,
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
    output: { maxTokenParam: 'none', defaultMaxTokens: 16_384, highMaxTokens: 65_536 },
  },
};

export const LLM_SERIES: ModelSeries[] = [
  {
    key: 'deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    isIdSwitch: false,
    instruct: { id: 'deepseek-ai/DeepSeek-V3.2', strategy: 'none' },
    thinking: { id: 'deepseek-ai/DeepSeek-V3.2', strategy: 'root_boolean' },
  },
  {
    key: 'glm-5',
    name: 'GLM 5',
    provider: 'ZhipuAI',
    isIdSwitch: false,
    instruct: { id: 'ZhipuAI/GLM-5', strategy: 'none' },
    thinking: { id: 'ZhipuAI/GLM-5', strategy: 'root_boolean' },
  },
  {
    key: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    provider: 'MiniMax',
    isIdSwitch: false,
    instruct: { id: 'MiniMax/MiniMax-M2.5', strategy: 'none' },
    thinking: { id: 'MiniMax/MiniMax-M2.5', strategy: 'native_always_on' },
  },
  {
    key: 'kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'Moonshot',
    isIdSwitch: false,
    instruct: { id: 'moonshotai/Kimi-K2.5', strategy: 'none' },
    thinking: { id: 'moonshotai/Kimi-K2.5', strategy: 'root_boolean' },
  },
  {
    key: 'qwen3.5-397b',
    name: 'Qwen3.5 397B',
    provider: 'Alibaba',
    isIdSwitch: false,
    instruct: { id: 'Qwen/Qwen3.5-397B-A17B', strategy: 'none' },
    thinking: { id: 'Qwen/Qwen3.5-397B-A17B', strategy: 'root_boolean' },
  },
];

export function getModelProfile(modelId: string): ModelProfile {
  return (
    MODEL_PROFILES[modelId] ?? {
      id: modelId,
      label: modelId.split('/').pop() || modelId,
      provider: 'Custom',
      source: 'custom',
      modalities: ['text', 'image'],
      availability: UNKNOWN_CUSTOM_AVAILABILITY,
      input: TEXT_AND_IMAGE_INPUT,
      thinking: { control: 'none', defaultEnabled: false, canDisable: true },
      output: { maxTokenParam: 'none', defaultMaxTokens: 16_384, highMaxTokens: 65_536 },
    }
  );
}

function getImageInputUsage(messages: ChatCompletionMessageParam[]) {
  const usage = {
    hasImage: false,
    hasImageUrl: false,
    hasImageDataUrl: false,
  };

  for (const message of messages) {
    if (!('content' in message) || !Array.isArray(message.content)) continue;

    for (const part of message.content) {
      if (part.type !== 'image_url') continue;
      usage.hasImage = true;

      const url = part.image_url.url;
      if (url.startsWith('data:image/')) {
        usage.hasImageDataUrl = true;
      } else {
        usage.hasImageUrl = true;
      }
    }
  }

  return usage;
}

export function hasImageInput(messages: ChatCompletionMessageParam[]): boolean {
  return getImageInputUsage(messages).hasImage;
}

export function assertModelSupportsMessages(
  profile: ModelProfile,
  messages: ChatCompletionMessageParam[]
): void {
  if (profile.source === 'custom') return;
  const imageUsage = getImageInputUsage(messages);

  if (imageUsage.hasImageUrl && !profile.input.imageUrl) {
    throw new Error(`Model ${profile.id} does not support image URL input.`);
  }

  if (imageUsage.hasImageDataUrl && !profile.input.imageDataUrl) {
    throw new Error(`Model ${profile.id} does not support image data URL input.`);
  }
}

function resolveThinkingEnabled(profile: ModelProfile, intent: ThinkingIntent): boolean {
  if (intent === 'auto') return profile.thinking.defaultEnabled;
  return intent === 'on';
}

function applyProfileThinkingParam(
  payload: ModelScopeChatPayload,
  profile: ModelProfile,
  enabled: boolean
): void {
  if (profile.thinking.control === 'root_boolean') {
    payload.enable_thinking = enabled;
  }

  if (profile.thinking.control === 'kwargs_dict') {
    payload.chat_template_kwargs = {
      thinking: enabled,
      enable_thinking: enabled,
    };
  }

  if (profile.thinking.control === 'thinking_object') {
    payload.thinking = {
      type: enabled ? 'enabled' : 'disabled',
    };
  }
}

export function hasThinkingParam(payload: ModelScopeChatPayload): boolean {
  return Boolean(
    payload.enable_thinking !== undefined || payload.chat_template_kwargs || payload.thinking
  );
}

export function buildModelScopeChatPayload(options: {
  model: string;
  messages: ChatCompletionMessageParam[];
  thinkingIntent?: ThinkingIntent;
  enableThinking?: boolean;
  maxTokens?: number;
  maxTokenParam?: OutputTokenParam;
}): ModelScopeChatPayload {
  const profile = getModelProfile(options.model);
  const thinkingIntent =
    options.thinkingIntent ??
    (options.enableThinking === undefined ? 'auto' : options.enableThinking ? 'on' : 'off');
  const payload: ModelScopeChatPayload = {
    model: options.model,
    messages: options.messages,
    stream: true,
  };

  if (options.maxTokens) {
    const param = options.maxTokenParam ?? profile.output.maxTokenParam;
    if (param === 'max_completion_tokens') {
      payload.max_completion_tokens = options.maxTokens;
    } else if (param === 'max_tokens') {
      payload.max_tokens = options.maxTokens;
    }
  }

  if (profile.source === 'custom') {
    if (thinkingIntent !== 'auto') {
      payload.enable_thinking = thinkingIntent === 'on';
    }
    return payload;
  }

  applyProfileThinkingParam(payload, profile, resolveThinkingEnabled(profile, thinkingIntent));
  return payload;
}
