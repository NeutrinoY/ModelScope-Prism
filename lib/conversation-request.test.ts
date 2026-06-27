import { describe, expect, it } from 'vitest';
import { parseConversationRequestBody } from './conversation-request';

const imagePart = { type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } };

describe('conversation request parsing', () => {
  it('allows image parts only on user messages', () => {
    const userResult = parseConversationRequestBody({
      messages: [{ role: 'user', content: [imagePart, { type: 'text', text: 'describe it' }] }],
      model: 'Qwen/Qwen3.5-397B-A17B',
    });
    expect(userResult.success).toBe(true);

    const assistantResult = parseConversationRequestBody({
      messages: [{ role: 'assistant', content: [imagePart] }],
      model: 'Qwen/Qwen3.5-397B-A17B',
    });
    expect(assistantResult.success).toBe(false);
  });

  it('rejects unsupported image URL schemes', () => {
    const result = parseConversationRequestBody({
      messages: [
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: 'file:///etc/passwd' } }],
        },
      ],
      model: 'Qwen/Qwen3.5-397B-A17B',
    });

    expect(result.success).toBe(false);
  });
});
