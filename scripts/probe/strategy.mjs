export function deriveThinkingProfile(ctx) {
  const baselineReasoning = ctx.baselineReasoning === true;
  const rootOnReasoning = ctx.rootOnReasoning === true;
  const kwargsOnReasoning = ctx.kwargsOnReasoning === true;
  const thinkingTypeOnReasoning = ctx.thinkingTypeOnReasoning === true;
  const rootOffDisabled = ctx.rootOffDisabled === true;
  const kwargsOffDisabled = ctx.kwargsOffDisabled === true;
  const thinkingTypeOffDisabled = ctx.thinkingTypeOffDisabled === true;

  if (baselineReasoning) {
    if (rootOffDisabled) {
      return {
        control: 'root_boolean',
        defaultEnabled: true,
        canDisable: true,
        notes: 'Reasoning is enabled by default and can be disabled with enable_thinking.',
      };
    }

    if (kwargsOffDisabled) {
      return {
        control: 'kwargs_dict',
        defaultEnabled: true,
        canDisable: true,
        notes: 'Reasoning is enabled by default and can be disabled with chat_template_kwargs.',
      };
    }

    if (thinkingTypeOffDisabled) {
      return {
        control: 'thinking_object',
        defaultEnabled: true,
        canDisable: true,
        notes: 'Reasoning is enabled by default and can be disabled with thinking.type.',
      };
    }

    return {
      control: 'native_always_on',
      defaultEnabled: true,
      canDisable: false,
      notes: 'Reasoning appears by default and was not disabled by known controls.',
    };
  }

  if (rootOnReasoning) {
    return {
      control: 'root_boolean',
      defaultEnabled: false,
      canDisable: true,
      notes: 'Reasoning can be enabled with enable_thinking.',
    };
  }

  if (kwargsOnReasoning) {
    return {
      control: 'kwargs_dict',
      defaultEnabled: false,
      canDisable: true,
      notes: 'Reasoning can be enabled with chat_template_kwargs.',
    };
  }

  if (thinkingTypeOnReasoning) {
    return {
      control: 'thinking_object',
      defaultEnabled: false,
      canDisable: true,
      notes: 'Reasoning can be enabled with thinking.type.',
    };
  }

  return {
    control: 'none',
    defaultEnabled: false,
    canDisable: true,
    notes: 'No reasoning output or supported thinking control was detected.',
  };
}
