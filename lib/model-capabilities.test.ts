import { describe, expect, it } from 'vitest';
import {
  assertModelSupportsMessages,
  buildModelScopeChatPayload,
  getModelProfile,
  hasImageInput,
  hasThinkingParam,
  MODEL_PROFILES,
} from './model-capabilities';

const textMessage = { role: 'user' as const, content: 'hello' };
const imageMessage = {
  role: 'user' as const,
  content: [
    { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,AA==' } },
    { type: 'text' as const, text: 'describe it' },
  ],
};
const remoteImageMessage = {
  role: 'user' as const,
  content: [
    { type: 'image_url' as const, image_url: { url: 'https://example.com/image.png' } },
    { type: 'text' as const, text: 'describe it' },
  ],
};

const availableChatStream = {
  chat: true,
  stream: true,
  status: 'available' as const,
};
const textInput = {
  text: true,
  imageUrl: false,
  imageDataUrl: false,
};

describe('model capabilities', () => {
  it('rejects image messages for text-only models', () => {
    const profile = getModelProfile('deepseek-ai/DeepSeek-V3.2');

    expect(() => assertModelSupportsMessages(profile, [imageMessage])).toThrow(
      'does not support image data URL input'
    );
    expect(() => assertModelSupportsMessages(profile, [remoteImageMessage])).toThrow(
      'does not support image URL input'
    );
  });

  it('allows image messages for multimodal models', () => {
    const profile = getModelProfile('Qwen/Qwen3.5-397B-A17B');

    expect(() => assertModelSupportsMessages(profile, [imageMessage])).not.toThrow();
  });

  it('does not block image messages for custom models', () => {
    const profile = getModelProfile('custom/provider-model');

    expect(profile.source).toBe('custom');
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
        thinkingIntent: 'on',
      })
    ).toMatchObject({ enable_thinking: true });

    expect(
      buildModelScopeChatPayload({
        model: 'MiniMax/MiniMax-M2.5',
        messages: [textMessage],
        thinkingIntent: 'on',
      })
    ).not.toHaveProperty('enable_thinking');
  });

  it('uses root boolean as the custom-model best-effort thinking control', () => {
    expect(
      buildModelScopeChatPayload({
        model: 'custom/provider-model',
        messages: [textMessage],
        thinkingIntent: 'auto',
      })
    ).not.toHaveProperty('enable_thinking');

    const payload = buildModelScopeChatPayload({
      model: 'custom/provider-model',
      messages: [textMessage],
      thinkingIntent: 'off',
    });

    expect(payload).toMatchObject({ enable_thinking: false });
    expect(hasThinkingParam(payload)).toBe(true);
  });

  it('maps thinking_object profiles to top-level thinking.type', () => {
    MODEL_PROFILES['Provider/ThinkingObject'] = {
      id: 'Provider/ThinkingObject',
      label: 'Thinking Object',
      provider: 'Provider',
      source: 'builtin',
      modalities: ['text'],
      availability: availableChatStream,
      input: textInput,
      thinking: { control: 'thinking_object', defaultEnabled: true, canDisable: true },
      output: { maxTokenParam: 'none', defaultMaxTokens: 16_384, highMaxTokens: 65_536 },
    };

    expect(
      buildModelScopeChatPayload({
        model: 'Provider/ThinkingObject',
        messages: [textMessage],
        thinkingIntent: 'off',
      })
    ).toMatchObject({ thinking: { type: 'disabled' } });
  });

  it('maps max completion token output control when profile declares it', () => {
    MODEL_PROFILES['Provider/MaxCompletion'] = {
      id: 'Provider/MaxCompletion',
      label: 'Max Completion',
      provider: 'Provider',
      source: 'builtin',
      modalities: ['text'],
      availability: availableChatStream,
      input: textInput,
      thinking: { control: 'none', defaultEnabled: false, canDisable: true },
      output: {
        maxTokenParam: 'max_completion_tokens',
        defaultMaxTokens: 16_384,
        highMaxTokens: 65_536,
      },
    };

    expect(
      buildModelScopeChatPayload({
        model: 'Provider/MaxCompletion',
        messages: [textMessage],
        maxTokens: 16_384,
      })
    ).toMatchObject({ max_completion_tokens: 16_384 });
  });
});
