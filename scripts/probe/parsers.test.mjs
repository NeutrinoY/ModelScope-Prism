import { describe, expect, it } from 'vitest';
import { parseNonStreamResult, parseStreamResult, summarizeResults } from './parsers.mjs';

describe('probe parsers', () => {
  it('parses non-stream content and reasoning diagnostics', () => {
    const result = parseNonStreamResult(
      200,
      JSON.stringify({
        choices: [
          {
            message: { content: 'answer', reasoning_content: 'thinking' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 3,
          completion_tokens: 5,
          total_tokens: 8,
          completion_tokens_details: { reasoning_tokens: 2 },
        },
      })
    );

    expect(result).toMatchObject({
      accepted: true,
      validContent: true,
      hasReasoning: true,
      contentLength: 6,
      reasoningLength: 8,
      finishReason: 'stop',
      contentPreview: 'answer',
      usage: {
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
        reasoningTokens: 2,
      },
      errorCategory: null,
    });
  });

  it('classifies invalid JSON without throwing', () => {
    const result = parseNonStreamResult(200, 'not-json');

    expect(result).toMatchObject({
      accepted: false,
      parseError: 'INVALID_JSON',
      errorCategory: 'invalid_json',
    });
  });

  it('parses streamed SSE chunks and counts parse errors', () => {
    const raw = [
      'data: {"choices":[{"delta":{"reasoning_content":"step"}}]}',
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
      reasoningLength: 4,
      finishReason: 'length',
      contentPreview: 'ok',
      usage: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      },
      parsedChunks: 3,
      parseErrors: 1,
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
