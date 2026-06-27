import { describe, expect, it } from 'vitest';
import { buildProfileSnippet, buildReport, slugifyModelId } from './report.mjs';

describe('probe report helpers', () => {
  it('builds profile snippets for model-capabilities.ts', () => {
    const snippet = buildProfileSnippet({
      modelId: 'Qwen/Qwen3.5-397B-A17B',
      strategy: 'root_boolean',
      provider: 'Qwen',
      label: 'Qwen3.5 397B A17B',
      modalities: ['text', 'image'],
    });

    expect(snippet).toContain("'Qwen/Qwen3.5-397B-A17B'");
    expect(snippet).toContain("modalities: ['text', 'image']");
    expect(snippet).toContain("control: 'root_boolean'");
    expect(snippet).not.toContain('apiKey');
  });

  it('builds reports without leaking secrets', () => {
    const report = buildReport({
      generatedAt: '2026-06-24T00:00:00.000Z',
      modelId: 'Provider/Model',
      mode: 'full',
      repeats: 2,
      strict: false,
      recommendation: { strategy: 'none', confidence: 'medium', notes: 'No toggle detected.' },
      tests: { baseline: [] },
      apiKey: 'ms-secret-token',
    });

    expect(JSON.stringify(report)).not.toContain('ms-secret-token');
    expect(report).toMatchObject({
      generatedAt: '2026-06-24T00:00:00.000Z',
      modelId: 'Provider/Model',
      recommendation: { strategy: 'none' },
    });
  });

  it('slugifies model ids for stable report filenames', () => {
    expect(slugifyModelId('Qwen/Qwen3.5-397B-A17B')).toBe('qwen_qwen3_5-397b-a17b');
  });
});
