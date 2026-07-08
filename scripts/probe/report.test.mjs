import { describe, expect, it } from 'vitest';
import {
  buildMarkdownOverview,
  buildProfileSnippet,
  buildReport,
  slugifyModelId,
} from './report.mjs';

describe('probe report helpers', () => {
  it('builds complete profile snippets for model-capabilities.ts', () => {
    const snippet = buildProfileSnippet({
      modelId: 'Qwen/Qwen3.5-397B-A17B',
      provider: 'Qwen',
      label: 'Qwen3.5 397B A17B',
      modalities: ['text', 'image'],
      availability: {
        chat: true,
        stream: true,
        status: 'available',
      },
      input: {
        text: true,
        imageUrl: true,
        imageDataUrl: true,
      },
      thinking: {
        control: 'root_boolean',
        defaultEnabled: true,
        canDisable: true,
      },
      output: {
        maxTokenParam: 'max_tokens',
        preferredMaxTokens: 16_384,
      },
    });

    expect(snippet).toContain("'Qwen/Qwen3.5-397B-A17B'");
    expect(snippet).toContain("source: 'builtin'");
    expect(snippet).toContain("modalities: ['text', 'image']");
    expect(snippet).toContain("availability: { chat: true, stream: true, status: 'available' }");
    expect(snippet).toContain('input: { text: true, imageUrl: true, imageDataUrl: true }');
    expect(snippet).toContain("control: 'root_boolean'");
    expect(snippet).toContain('defaultEnabled: true');
    expect(snippet).toContain("maxTokenParam: 'max_tokens'");
    expect(snippet).not.toContain('apiKey');
  });

  it('builds reports without leaking secrets', () => {
    const report = buildReport({
      generatedAt: '2026-06-24T00:00:00.000Z',
      modelId: 'Provider/Model',
      tests: { baseline: [] },
      apiKey: 'ms-secret-token',
    });

    expect(JSON.stringify(report)).not.toContain('ms-secret-token');
    expect(report).toMatchObject({
      generatedAt: '2026-06-24T00:00:00.000Z',
      modelId: 'Provider/Model',
      capability: {
        availability: { chat: false, stream: false, status: 'unavailable' },
        input: { text: false, imageUrl: false, imageDataUrl: false },
        output: { maxTokenParam: 'none', preferredMaxTokens: null },
      },
    });
  });

  it('builds a concise markdown overview for humans', () => {
    const report = buildReport({
      generatedAt: '2026-06-24T00:00:00.000Z',
      modelId: 'Provider/Model',
      capability: {
        availability: { chat: true, stream: true, status: 'available', latencyMs: 123 },
        input: {
          text: true,
          imageUrl: false,
          imageDataUrl: true,
        },
        thinking: {
          control: 'root_boolean',
          defaultEnabled: true,
          canDisable: true,
          notes: 'ok',
        },
        output: {
          maxTokenParam: 'max_tokens',
          preferredMaxTokens: 16_384,
        },
      },
      tests: { baseline: [] },
    });

    const overview = buildMarkdownOverview(report);

    expect(overview).toContain('# Model Probe Overview');
    expect(overview).toContain('- Image data URL input: yes');
    expect(overview).toContain('- Thinking control: root_boolean');
    expect(overview).toContain('- Output token parameter: max_tokens');
    expect(overview).toContain('- Preferred max tokens: 16384');
    expect(overview).toContain('```ts');
  });

  it('slugifies model ids for stable report filenames', () => {
    expect(slugifyModelId('Qwen/Qwen3.5-397B-A17B')).toBe('qwen_qwen3_5-397b-a17b');
  });
});
