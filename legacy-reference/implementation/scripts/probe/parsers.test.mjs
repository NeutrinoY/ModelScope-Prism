import { describe, expect, it } from 'vitest';
import { parseStreamResult, summarizeResults } from './parsers.mjs';

describe('probe parsers', () => {
  it('parses streamed SSE chunks and counts parse errors', () => {
    const raw = [
      'data: {"choices":[{"delta":{"reasoning_content":"step"}}]}',
      'data: {"choices":[{"delta":{"reasoning":" two"}}]}',
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      'data: {"choices":[{"finish_reason":"length","delta":{}}]}',
      'data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}',
      'data: [DONE]',
      'data: {broken',
    ].join('\n');

    const result = parseStreamResult(200, raw);

    expect(result).toMatchObject({
      accepted: true,
      validContent: true,
      hasReasoning: true,
      contentLength: 2,
      reasoningLength: 8,
      finishReason: 'length',
      contentPreview: 'ok',
      usage: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      },
      parsedChunks: 4,
      parseErrors: 1,
    });
  });

  it('classifies streamed quota errors with the provider message', () => {
    const result = parseStreamResult(
      402,
      JSON.stringify({
        error: {
          message: 'insufficient balance (1008)',
          type: 'insufficient_balance_error',
        },
      })
    );

    expect(result).toMatchObject({
      accepted: false,
      validContent: false,
      errorCategory: 'rate_limit',
      errorMessage: 'insufficient balance (1008)',
    });
  });

  it('summarizes result confidence inputs', () => {
    const summary = summarizeResults([
      { accepted: true, validContent: true, hasReasoning: true, durationMs: 100 },
      { accepted: true, validContent: true, hasReasoning: false, durationMs: 300 },
      { accepted: false, validContent: false, hasReasoning: false, durationMs: 200 },
    ]);

    expect(summary).toMatchObject({
      samples: 3,
      acceptedCount: 2,
      validCount: 2,
      reasoningCount: 1,
      usageCount: 0,
      acceptedMajority: true,
      validMajority: true,
      reasoningMajority: false,
      avgLatencyMs: 200,
    });
  });

  it('does not mark empty samples as majority matches', () => {
    expect(summarizeResults([])).toMatchObject({
      samples: 0,
      acceptedMajority: false,
      validMajority: false,
      reasoningMajority: false,
      usageMajority: false,
    });
  });
});
