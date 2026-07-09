import { z } from 'zod';
import type { ThinkingIntent } from '@/lib/model-capabilities';

const MAX_IMAGE_URL_LENGTH = 12_000_000;
const MAX_CONTENT_PARTS = 20;
const MAX_IMAGES_PER_REQUEST = 8;

function isSupportedImageUrl(value: string): boolean {
  if (value.length > MAX_IMAGE_URL_LENGTH) return false;
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(20_000),
});

const imagePartSchema = z.object({
  type: z.literal('image_url'),
  image_url: z.object({
    url: z
      .string()
      .min(1)
      .refine(isSupportedImageUrl, 'image_url must be http(s) or data:image base64.'),
  }),
});

const userMessageSchema = z.object({
  role: z.literal('user'),
  content: z.union([
    z.string().min(1).max(20_000),
    z
      .array(z.union([textPartSchema, imagePartSchema]))
      .min(1)
      .max(MAX_CONTENT_PARTS),
  ]),
});

const textOnlyMessageSchema = z.object({
  role: z.enum(['system', 'developer', 'assistant']),
  content: z.string().min(1).max(20_000),
});

export const conversationBodySchema = z
  .object({
    messages: z
      .array(z.union([userMessageSchema, textOnlyMessageSchema]))
      .min(1)
      .max(50),
    model: z.string().trim().min(1).max(120).default('deepseek-ai/DeepSeek-V4-Flash'),
    apiKey: z.string().optional(),
    enableThinking: z.boolean().optional(),
    thinkingIntent: z.enum(['auto', 'on', 'off']).optional(),
  })
  .superRefine((body, ctx) => {
    const imageCount = body.messages.reduce((count, message) => {
      if (!Array.isArray(message.content)) return count;
      return count + message.content.filter((part) => part.type === 'image_url').length;
    }, 0);

    if (imageCount > MAX_IMAGES_PER_REQUEST) {
      ctx.addIssue({
        code: 'custom',
        message: `messages may contain at most ${MAX_IMAGES_PER_REQUEST} image parts.`,
        path: ['messages'],
      });
    }
  });

export type ConversationRequestBody = z.infer<typeof conversationBodySchema>;

export function parseConversationRequestBody(input: unknown) {
  return conversationBodySchema.safeParse(input);
}

export function resolveConversationThinkingIntent(
  body: Pick<ConversationRequestBody, 'enableThinking' | 'thinkingIntent'>
): ThinkingIntent {
  if (body.thinkingIntent) return body.thinkingIntent;
  if (body.enableThinking === undefined) return 'auto';
  return body.enableThinking ? 'on' : 'off';
}
