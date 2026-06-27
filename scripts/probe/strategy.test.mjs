import { describe, expect, it } from 'vitest';
import { deriveStrategy, getConfidenceLabel } from './strategy.mjs';

describe('probe strategy inference', () => {
  it('detects strict always-on reasoning models', () => {
    expect(
      deriveStrategy({
        mode: 'full',
        strict: true,
        baselineReasoning: true,
      })
    ).toMatchObject({
      strategy: 'native_always_on',
      confidence: 'high',
    });
  });

  it('prefers root boolean when it enables reasoning', () => {
    expect(
      deriveStrategy({
        mode: 'full',
        strict: false,
        baselineReasoning: false,
        rootOnReasoning: true,
      })
    ).toMatchObject({
      strategy: 'root_boolean',
      confidence: 'high',
    });
  });

  it('marks quick mode disable-path as lower confidence', () => {
    expect(
      deriveStrategy({
        mode: 'quick',
        strict: false,
        baselineReasoning: true,
        rootOffDisabled: false,
        kwargsThinkingOffDisabled: false,
      })
    ).toMatchObject({
      strategy: 'none',
      confidence: 'low',
    });
  });

  it('labels confidence from sample health', () => {
    expect(getConfidenceLabel({ mode: 'full', acceptedSamples: 4, parseErrors: 0 })).toBe('high');
    expect(getConfidenceLabel({ mode: 'quick', acceptedSamples: 1, parseErrors: 0 })).toBe(
      'medium'
    );
    expect(getConfidenceLabel({ mode: 'full', acceptedSamples: 0, parseErrors: 2 })).toBe('low');
  });
});
