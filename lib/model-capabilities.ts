import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type ModelModality = 'text' | 'image';
export type ThinkingControl = 'none' | 'root_boolean' | 'kwargs_dict' | 'native_always_on';

export type ConversationMessage = Extract<
  ChatCompletionMessageParam,
  { role: 'user' | 'assistant' | 'system' | 'developer' }
>;

export type ModelProfile = {
  id: string;
  label: string;
  provider: string;
  modalities: ModelModality[];
  thinking: {
    control: ThinkingControl;
    defaultEnabled: boolean;
    canDisable: boolean;
  };
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
  enable_thinking?: boolean;
  chat_template_kwargs?: {
    thinking: boolean;
    enable_thinking: boolean;
  };
};

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  'deepseek-ai/DeepSeek-V3.2': {
    id: 'deepseek-ai/DeepSeek-V3.2',
    label: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    modalities: ['text'],
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
  },
  'ZhipuAI/GLM-5': {
    id: 'ZhipuAI/GLM-5',
    label: 'GLM 5',
    provider: 'ZhipuAI',
    modalities: ['text'],
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
  },
  'MiniMax/MiniMax-M2.5': {
    id: 'MiniMax/MiniMax-M2.5',
    label: 'MiniMax M2.5',
    provider: 'MiniMax',
    modalities: ['text'],
    thinking: { control: 'native_always_on', defaultEnabled: true, canDisable: false },
  },
  'moonshotai/Kimi-K2.5': {
    id: 'moonshotai/Kimi-K2.5',
    label: 'Kimi K2.5',
    provider: 'Moonshot',
    modalities: ['text'],
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
  },
  'Qwen/Qwen3.5-397B-A17B': {
    id: 'Qwen/Qwen3.5-397B-A17B',
    label: 'Qwen3.5 397B',
    provider: 'Alibaba',
    modalities: ['text', 'image'],
    thinking: { control: 'root_boolean', defaultEnabled: false, canDisable: true },
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
      modalities: ['text'],
      thinking: { control: 'none', defaultEnabled: false, canDisable: true },
    }
  );
}

export function hasImageInput(messages: ChatCompletionMessageParam[]): boolean {
  return messages.some((message) => {
    if (!('content' in message) || !Array.isArray(message.content)) return false;
    return message.content.some((part) => part.type === 'image_url');
  });
}

export function assertModelSupportsMessages(
  profile: ModelProfile,
  messages: ChatCompletionMessageParam[]
): void {
  if (hasImageInput(messages) && !profile.modalities.includes('image')) {
    throw new Error(`Model ${profile.id} does not support image input.`);
  }
}

export function buildModelScopeChatPayload(options: {
  model: string;
  messages: ChatCompletionMessageParam[];
  enableThinking: boolean;
  maxTokens?: number;
}): ModelScopeChatPayload {
  const profile = getModelProfile(options.model);
  const payload: ModelScopeChatPayload = {
    model: options.model,
    messages: options.messages,
    stream: true,
  };

  if (options.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }

  if (profile.thinking.control === 'root_boolean') {
    payload.enable_thinking = options.enableThinking;
  }

  if (profile.thinking.control === 'kwargs_dict') {
    payload.chat_template_kwargs = {
      thinking: options.enableThinking,
      enable_thinking: options.enableThinking,
    };
  }

  return payload;
}
