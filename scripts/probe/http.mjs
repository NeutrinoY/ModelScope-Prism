/**
 * Probe HTTP helpers — offline developer diagnostics only.
 * Never imported by runtime code (docs/rebuild/04 probe boundary).
 */

const BASE_URL = process.env.PRISM_PROBE_BASE_URL || 'https://api-inference.modelscope.cn/v1';

export function resolveApiKey() {
  const key = process.env.MS_API_KEY || process.env.MODELSCOPE_API_KEY || '';
  if (!key) {
    console.error('Set MS_API_KEY (or MODELSCOPE_API_KEY) in the environment or .env.local');
    process.exit(1);
  }
  return key;
}

/**
 * Send one streaming chat/completions request and collect the outcome.
 * Returns { ok, status, content, reasoning, error, durationMs }.
 */
export async function probeChatCompletion({ apiKey, payload, timeoutMs = 60_000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: summarizeUpstreamError(
          response.status,
          bodyText,
          response.headers.get('retry-after')
        ),
        durationMs: Date.now() - startedAt,
      };
    }

    const { content, reasoning } = await collectSseStream(response);
    return {
      ok: true,
      status: response.status,
      content,
      reasoning,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: {
        kind: error?.name === 'AbortError' ? 'timeout' : 'network',
        message: String(error?.message || error),
      },
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Collect content / reasoning deltas from an OpenAI-compatible SSE stream. */
async function collectSseStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let reasoning = '';

  const consumeLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      const parsed = JSON.parse(data);
      const delta = parsed.choices?.[0]?.delta;
      if (!delta) return;
      if (delta.content) content += delta.content;
      const r = delta.reasoning_content ?? delta.reasoning;
      if (r) reasoning += r;
    } catch {
      // ignore malformed SSE lines
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) consumeLine(line);
  }
  consumeLine(buffer);

  return { content, reasoning };
}

function retryAfterMs(headerValue) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }
  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

function summarizeUpstreamError(status, bodyText, retryAfterHeader) {
  let message = bodyText.slice(0, 300);
  try {
    const parsed = JSON.parse(bodyText);
    message = parsed.errors?.message ?? parsed.error?.message ?? parsed.message ?? message;
  } catch {
    // keep raw slice
  }

  let kind = 'upstream_error';
  if (status === 401 || status === 403) kind = 'auth';
  else if (status === 402) kind = 'quota';
  else if (status === 429) kind = 'rate_limited';
  else if (status === 404) kind = 'model_unavailable';
  else if (status === 400 || status === 422) kind = 'rejected';

  const error = { kind, status, message };
  const retryAfter = retryAfterMs(retryAfterHeader);
  if (retryAfter !== null) error.retryAfterMs = retryAfter;
  return error;
}
