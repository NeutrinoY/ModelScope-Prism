export function getConfidenceLabel({ mode, acceptedSamples, parseErrors }) {
  if (acceptedSamples < 1 || parseErrors > 0) return 'low';
  if (mode === 'quick' || acceptedSamples < 2) return 'medium';
  return 'high';
}

export function deriveStrategy(ctx) {
  const mode = ctx.mode || 'full';
  const strict = ctx.strict === true;
  const baselineReasoning = ctx.baselineReasoning === true;
  const rootOnReasoning = ctx.rootOnReasoning === true;
  const kwargsThinkingOnReasoning = ctx.kwargsThinkingOnReasoning === true;
  const kwargsEnableOnReasoning = ctx.kwargsEnableOnReasoning === true;
  const rootOffDisabled = ctx.rootOffDisabled === true;
  const kwargsThinkingOffDisabled = ctx.kwargsThinkingOffDisabled === true;
  const kwargsEnableOffDisabled = ctx.kwargsEnableOffDisabled === true;

  if (baselineReasoning && strict) {
    return {
      strategy: 'native_always_on',
      confidence: 'high',
      notes: 'Reasoning appears by default and unknown params are rejected.',
    };
  }

  if (baselineReasoning && !strict) {
    if (rootOffDisabled) {
      return {
        strategy: 'root_boolean',
        confidence: mode === 'quick' ? 'medium' : 'high',
        notes: 'Reasoning can be turned off with top-level enable_thinking.',
      };
    }
    if (kwargsThinkingOffDisabled || kwargsEnableOffDisabled) {
      return {
        strategy: 'kwargs_dict',
        confidence: mode === 'quick' ? 'medium' : 'high',
        notes: 'Reasoning can be toggled using chat_template_kwargs.',
      };
    }
    if (mode === 'quick') {
      return {
        strategy: 'none',
        confidence: 'low',
        notes:
          'Quick mode result is inconclusive for disable-path. Run full mode for reliable toggle strategy.',
      };
    }
    return {
      strategy: 'native_always_on',
      confidence: 'medium',
      notes: 'Reasoning is default and not reliably disabled by known toggles.',
    };
  }

  if (rootOnReasoning) {
    return {
      strategy: 'root_boolean',
      confidence: mode === 'quick' ? 'medium' : 'high',
      notes: 'Reasoning can be enabled with top-level enable_thinking.',
    };
  }

  if (kwargsThinkingOnReasoning || kwargsEnableOnReasoning) {
    return {
      strategy: 'kwargs_dict',
      confidence: mode === 'quick' ? 'medium' : 'high',
      notes: 'Reasoning can be enabled with chat_template_kwargs.',
    };
  }

  return {
    strategy: 'none',
    confidence: mode === 'quick' ? 'medium' : 'high',
    notes: 'No reliable reasoning toggle detected with known probes.',
  };
}
