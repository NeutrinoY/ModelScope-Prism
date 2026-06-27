export type ConversationRequestPayload = {
  messages: unknown[];
  model: string;
  apiKey: string;
  enableThinking?: boolean;
};

export async function requestConversationStream(
  payload: ConversationRequestPayload,
  signal: AbortSignal
): Promise<Response> {
  return fetch('/api/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
}
