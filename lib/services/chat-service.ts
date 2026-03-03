export type ChatRequestPayload = {
  messages: unknown[];
  model: string;
  apiKey: string;
  enableThinking: boolean;
};

export async function requestChatStream(
  payload: ChatRequestPayload,
  signal: AbortSignal
): Promise<Response> {
  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}
