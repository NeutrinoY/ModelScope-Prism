export type ModelStrategy = 'deepseek' | 'template_args' | 'native' | 'none';

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
    thinking: { id: 'deepseek-ai/DeepSeek-V3.2', strategy: 'deepseek' } // When ON
  },
  {
    key: 'qwen3',
    name: 'Qwen3 235B',
    provider: 'Alibaba',
    isIdSwitch: true,
    instruct: { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', strategy: 'none' },
    thinking: { id: 'Qwen/Qwen3-235B-A22B-Thinking-2507', strategy: 'native' }
  },
  {
    key: 'qwen3-coder',
    name: 'Qwen3 Coder',
    provider: 'Alibaba',
    isIdSwitch: false,
    instruct: { id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct', strategy: 'none' },
    // No thinking variant
  },
  {
    key: 'qwen3-next',
    name: 'Qwen3 Next 80B',
    provider: 'Alibaba',
    isIdSwitch: true,
    instruct: { id: 'Qwen/Qwen3-Next-80B-A3B-Instruct', strategy: 'none' },
    thinking: { id: 'Qwen/Qwen3-Next-80B-A3B-Thinking', strategy: 'native' }
  },
  {
    key: 'mimo-v2',
    name: 'MiMo V2 Flash',
    provider: 'Xiaomi',
    isIdSwitch: false,
    instruct: { id: 'XiaomiMiMo/MiMo-V2-Flash', strategy: 'none' }, 
    thinking: { id: 'XiaomiMiMo/MiMo-V2-Flash', strategy: 'template_args' }
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
  'deepseek-ai/DeepSeek-V3.2': 'deepseek',
  'XiaomiMiMo/MiMo-V2-Flash': 'template_args',
  'Qwen/Qwen3-Next-80B-A3B-Thinking': 'native',
  'Qwen/Qwen3-235B-A22B-Thinking-2507': 'native',
};

export const getModelStrategy = (id: string): ModelStrategy => {
  return MODEL_STRATEGIES[id] || 'none';
};