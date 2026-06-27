import { describe, expect, it } from 'vitest';
import {
  assertModelSupportsMessages,
  buildModelScopeChatPayload,
  getModelProfile,
  hasImageInput,
} from './model-capabilities';

const textMessage = { role: 'user' as const, content: 'hello' };
const imageMessage = {
  role: 'user' as const,
  content: [
    { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,AA==' } },
    { type: 'text' as const, text: 'describe it' },
  ],
};

describe('model capabilities', () => {
  it('rejects image messages for text-only models', () => {
    const profile = getModelProfile('deepseek-ai/DeepSeek-V3.2');

    expect(() => assertModelSupportsMessages(profile, [imageMessage])).toThrow(
      'does not support image input'
    );
  });

  it('allows image messages for multimodal models', () => {
    const profile = getModelProfile('Qwen/Qwen3.5-397B-A17B');

    expect(() => assertModelSupportsMessages(profile, [imageMessage])).not.toThrow();
  });

  it('detects image parts regardless of message role', () => {
    expect(hasImageInput([imageMessage])).toBe(true);
    expect(
      hasImageInput([
        {
          role: 'assistant',
          content: imageMessage.content,
        } as never,
      ])
    ).toBe(true);
  });

  it('injects provider-specific thinking params only when the profile supports them', () => {
    expect(
      buildModelScopeChatPayload({
        model: 'deepseek-ai/DeepSeek-V3.2',
        messages: [textMessage],
        enableThinking: true,
      })
    ).toMatchObject({ enable_thinking: true });

    expect(
      buildModelScopeChatPayload({
        model: 'MiniMax/MiniMax-M2.5',
        messages: [textMessage],
        enableThinking: true,
      })
    ).not.toHaveProperty('enable_thinking');
  });
});
