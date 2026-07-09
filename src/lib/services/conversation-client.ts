import type {
  ConversationRequest,
  ConversationStreamEvent,
  PrismError,
  PrismErrorCode,
} from '../contracts';

/**
 * Frontend client for internal API routes. Features call this layer;
 * they never fetch ModelScope directly (docs/rebuild/07 services layer).
 */

export class ClientError extends Error {
  readonly code: PrismErrorCode;
  readonly requestId?: string;

  constructor(code: PrismErrorCode, message: string, requestId?: string) {
    super(message);
    this.name = 'ClientError';
    this.code = code;
    this.requestId = requestId;
  }
}

export async function toClientError(response: Response): Promise<ClientError> {
  const requestId = response.headers.get('X-Request-Id') ?? undefined;
  const text = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as PrismError;
    if (parsed?.error?.code && parsed?.error?.message) {
      return new ClientError(parsed.error.code, parsed.error.message, requestId);
    }
  } catch {
    // fall through
  }
  return new ClientError('UPSTREAM_ERROR', text || 'Request failed.', requestId);
}

export type ConversationStreamCallbacks = {
  onDelta: (event: { c?: string; r?: string }) => void;
  onNotice?: (notice: { message: string; code?: string }) => void;
};

/**
 * Send a conversation request and consume the Prism NDJSON stream.
 * The token travels in the Authorization header for this request only.
 */
export async function streamConversation(
  request: ConversationRequest,
  apiKey: string,
  callbacks: ConversationStreamCallbacks,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch('/api/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw await toClientError(response);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ClientError('NETWORK_ERROR', 'No stream reader available.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const event = JSON.parse(trimmed) as ConversationStreamEvent;
      if (event.c || event.r) {
        callbacks.onDelta({
          ...(event.c ? { c: event.c } : {}),
          ...(event.r ? { r: event.r } : {}),
        });
      } else if (event.n) {
        callbacks.onNotice?.({ message: event.n, ...(event.code ? { code: event.code } : {}) });
      }
    } catch {
      // Ignore malformed lines; errors travel via HTTP error responses.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      handleLine(line);
    }
  }
  handleLine(buffer);
}
