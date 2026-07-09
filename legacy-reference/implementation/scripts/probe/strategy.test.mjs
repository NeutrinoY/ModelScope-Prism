import { describe, expect, it } from 'vitest';
import { deriveThinkingProfile } from './strategy.mjs';

describe('probe thinking strategy inference', () => {
  it('detects always-on reasoning when disable controls do not work', () => {
    expect(
      deriveThinkingProfile({
        baselineReasoning: true,
        rootOffDisabled: false,
        kwargsOffDisabled: false,
        thinkingTypeOffDisabled: false,
      })
    ).toMatchObject({
      control: 'native_always_on',
      defaultEnabled: true,
      canDisable: false,
    });
  });

  it('prefers root boolean when it enables reasoning', () => {
    expect(
      deriveThinkingProfile({
        baselineReasoning: false,
        rootOnReasoning: true,
      })
    ).toMatchObject({
      control: 'root_boolean',
      defaultEnabled: false,
      canDisable: true,
    });
  });

  it('detects kwargs disable strategy for default reasoning models', () => {
    expect(
      deriveThinkingProfile({
        baselineReasoning: true,
        kwargsOffDisabled: true,
      })
    ).toMatchObject({
      control: 'kwargs_dict',
      defaultEnabled: true,
      canDisable: true,
    });
  });

  it('detects top-level thinking object enable strategy', () => {
    expect(
      deriveThinkingProfile({
        baselineReasoning: false,
        thinkingTypeOnReasoning: true,
      })
    ).toMatchObject({
      control: 'thinking_object',
      defaultEnabled: false,
      canDisable: true,
    });
  });
});
