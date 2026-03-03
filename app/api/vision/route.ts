import { NextRequest } from 'next/server';
import {
  applyRateLimit,
  extractApiKey,
  fetchWithTimeout,
  isAbortError,
  jsonError,
  parseJsonBody,
  sanitizeUpstreamStatus,
} from '@/lib/api-security';

export const runtime = 'edge';

type VisionBody = {
  messages: unknown;
  model?: unknown;
  apiKey?: unknown;
};

function validateVisionBody(body: VisionBody): {
  ok: true;
  messages: unknown[];
  model?: string;
} | {
  ok: false;
  response: Response;
} {
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 30) {
    return { ok: false, response: jsonError('INVALID_MESSAGES', 'messages must contain 1 to 30 items.', 400) };
  }

  for (const item of body.messages) {
    if (!item || typeof item !== 'object') {
      return { ok: false, response: jsonError('INVALID_MESSAGES', 'messages format is invalid.', 400) };
    }
    const role = (item as { role?: unknown }).role;
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      return { ok: false, response: jsonError('INVALID_MESSAGES', 'message role is invalid.', 400) };
    }
  }

  const model = typeof body.model === 'string' ? body.model.trim() : undefined;
  if (model && model.length > 120) {
    return { ok: false, response: jsonError('INVALID_MODEL', 'model id is too long.', 400) };
  }

  return { ok: true, messages: body.messages, model };
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, { routeKey: 'vision', max: 20, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  try {
    const parsed = await parseJsonBody<VisionBody>(req, 15_000_000);
    if (!parsed.ok) return parsed.response;

    const validation = validateVisionBody(parsed.data);
    if (!validation.ok) return validation.response;

    const apiKey = extractApiKey(req, parsed.data.apiKey);
    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'API Key is required.', 400);
    }

    // Direct fetch for better field control
    const res = await fetchWithTimeout('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: validation.model || 'Qwen/Qwen3.5-397B-A17B',
        messages: validation.messages,
        stream: true,
        max_tokens: 4096,
        // Include thinking params just in case future VLM models support it
        enable_thinking: true,
        chat_template_kwargs: {
          enable_thinking: true,
          thinking: true
        }
      })
    }, 60_000);

    if (!res.ok) {
      const upstreamBody = await res.text();
      console.error('[vision upstream]', res.status, upstreamBody.slice(0, 500));
      return jsonError(
        'UPSTREAM_ERROR',
        'Model provider request failed.',
        sanitizeUpstreamStatus(res.status)
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        
        let buffer = '';

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
              if (!trimmedLine.startsWith('data: ')) continue;

              const jsonStr = trimmedLine.replace('data: ', '');
              try {
                const chunk = JSON.parse(jsonStr);
                const delta = chunk.choices?.[0]?.delta;
                
                if (!delta) continue;

                const reasoning = delta.reasoning_content;
                const content = delta.content;

                // Send structured JSON stream back to frontend
                if (reasoning || content) {
                  const payload = JSON.stringify({ r: reasoning || '', c: content || '' });
                  controller.enqueue(encoder.encode(payload + '\n'));
                }

              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    if (isAbortError(error)) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504);
    }
    console.error('Vision API Error:', error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
