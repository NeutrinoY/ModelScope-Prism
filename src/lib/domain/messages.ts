import type {
  ConversationContentPart,
  ConversationMessage,
  ImageInputValue,
  MultimodalConversationMessage,
  TextConversationMessage,
} from '../contracts';

/**
 * Conversation message construction and normalization (pure domain rules).
 *
 * No images  -> plain text message
 * With images -> multimodal content parts (text part + one image_url part
 *                per image), per docs/rebuild/04.
 */

export function buildUserMessage(
  text: string,
  images: ImageInputValue[] = []
): ConversationMessage {
  if (images.length === 0) {
    return { role: 'user', content: text };
  }

  const parts: ConversationContentPart[] = [];
  if (text.trim()) {
    parts.push({ type: 'text', text });
  }
  for (const image of images) {
    parts.push({ type: 'image_url', image_url: { url: image.url } });
  }
  return { role: 'user', content: parts };
}

/** Strip local-only fields (reasoning, requestMeta) before sending upstream. */
export function toWireMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return messages.map((message) => {
    if (typeof message.content === 'string') {
      const wire: TextConversationMessage = { role: message.role, content: message.content };
      return wire;
    }
    const wire: MultimodalConversationMessage = {
      role: 'user',
      content: message.content,
    };
    return wire;
  });
}

export function isMultimodalMessage(
  message: ConversationMessage
): message is MultimodalConversationMessage {
  return Array.isArray(message.content);
}

/** Extract the plain text of a message (used for titles and previews). */
export function messageText(message: ConversationMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part): part is Extract<ConversationContentPart, { type: 'text' }> => {
      return part.type === 'text';
    })
    .map((part) => part.text)
    .join(' ');
}

/** Extract image URLs referenced by a message. */
export function messageImageUrls(message: ConversationMessage): string[] {
  if (typeof message.content === 'string') return [];
  return message.content
    .filter((part): part is Extract<ConversationContentPart, { type: 'image_url' }> => {
      return part.type === 'image_url';
    })
    .map((part) => part.image_url.url);
}

export function hasImageInput(messages: ConversationMessage[]): boolean {
  return messages.some((message) => messageImageUrls(message).length > 0);
}
