export type ModelStrategy = 'root_boolean' | 'kwargs_dict' | 'native_always_on' | 'none';

export interface ModelVariant {
  id: string; // The actual ModelScope ID
  strategy: ModelStrategy;
}

export interface ModelSeries {
  key: string; // Internal key for UI identification
  name: string;
  provider: string; // For UI badge
  
  // Variants
  instruct: ModelVariant; // The "OFF" state
  thinking?: ModelVariant; // The "ON" state (optional if not supported)
  
  // If true, switching thinking means changing the Model ID (e.g. Qwen)
  // If false, switching thinking means changing API params (e.g. DeepSeek)
  isIdSwitch: boolean; 
}

export const LLM_SERIES: ModelSeries[] = [
  {
    key: 'deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    isIdSwitch: false,
    instruct: { id: 'deepseek-ai/DeepSeek-V3.2', strategy: 'none' }, // When OFF
    thinking: { id: 'deepseek-ai/DeepSeek-V3.2', strategy: 'root_boolean' } // When ON
  },
  {
    key: 'glm-5',
    name: 'GLM 5',
    provider: 'ZhipuAI',
    isIdSwitch: false,
    instruct: { id: 'ZhipuAI/GLM-5', strategy: 'none' }, 
    thinking: { id: 'ZhipuAI/GLM-5', strategy: 'root_boolean' }
  },
  {
    key: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    provider: 'MiniMax',
    isIdSwitch: false,
    instruct: { id: 'MiniMax/MiniMax-M2.5', strategy: 'none' },
    thinking: { id: 'MiniMax/MiniMax-M2.5', strategy: 'native_always_on' } // Natively supports reasoning without extra params
  },
  {
    key: 'kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'Moonshot',
    isIdSwitch: false,
    instruct: { id: 'moonshotai/Kimi-K2.5', strategy: 'none' },
    thinking: { id: 'moonshotai/Kimi-K2.5', strategy: 'root_boolean' }
  },
  {
    key: 'qwen3.5-397b',
    name: 'Qwen3.5 397B',
    provider: 'Alibaba',
    isIdSwitch: false,
    instruct: { id: 'Qwen/Qwen3.5-397B-A17B', strategy: 'none' },
    thinking: { id: 'Qwen/Qwen3.5-397B-A17B', strategy: 'root_boolean' }
  }
];

export const getModelCapability = (modelId: string) => {
  for (const series of LLM_SERIES) {
    if (series.instruct.id === modelId) return series.instruct;
    if (series.thinking?.id === modelId) return series.thinking;
  }
  return { id: modelId, strategy: 'none' as ModelStrategy };
};

export const MODEL_STRATEGIES: Record<string, ModelStrategy> = {
  'deepseek-ai/DeepSeek-V3.2': 'root_boolean',
  'ZhipuAI/GLM-5': 'root_boolean',
  'MiniMax/MiniMax-M2.5': 'native_always_on',
  'moonshotai/Kimi-K2.5': 'root_boolean',
  'Qwen/Qwen3.5-397B-A17B': 'root_boolean',
};

export const getModelStrategy = (id: string): ModelStrategy => {
  return MODEL_STRATEGIES[id] || 'none';
};