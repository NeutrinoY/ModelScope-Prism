import { NextRequest } from 'next/server';
import { getModelStrategy } from '@/lib/models';
import {
  applyRateLimit,
  extractApiKey,
  fetchWithTimeout,
  isAbortError,
  jsonError,
  parseJsonBody,
  sanitizeUpstreamStatus,
} from '@/lib/api-security';

// export const runtime = 'edge';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ChatBody = {
  messages: unknown;
  model?: unknown;
  apiKey?: unknown;
  enableThinking?: unknown;
};

function validateChatBody(body: ChatBody): {
  ok: true;
  messages: ChatMessage[];
  model?: string;
  enableThinking: boolean;
} | {
  ok: false;
  response: Response;
} {
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 50) {
    return { ok: false, response: jsonError('INVALID_MESSAGES', 'messages must contain 1 to 50 items.', 400) };
  }

  const parsed: ChatMessage[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== 'object') {
      return { ok: false, response: jsonError('INVALID_MESSAGES', 'messages format is invalid.', 400) };
    }
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      return { ok: false, response: jsonError('INVALID_MESSAGES', 'message role is invalid.', 400) };
    }
    if (typeof content !== 'string' || content.length < 1 || content.length > 20000) {
      return { ok: false, response: jsonError('INVALID_MESSAGES', 'message content length is invalid.', 400) };
    }
    parsed.push({ role, content });
  }

  const model = typeof body.model === 'string' ? body.model.trim() : undefined;
  if (model && model.length > 120) {
    return { ok: false, response: jsonError('INVALID_MODEL', 'model id is too long.', 400) };
  }

  const enableThinking = typeof body.enableThinking === 'boolean' ? body.enableThinking : false;

  return { ok: true, messages: parsed, model, enableThinking };
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, { routeKey: 'chat', max: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  try {
    const parsed = await parseJsonBody<ChatBody>(req, 350_000);
    if (!parsed.ok) return parsed.response;

    const validation = validateChatBody(parsed.data);
    if (!validation.ok) return validation.response;

    const apiKey = extractApiKey(req, parsed.data.apiKey);
    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'API Key is required.', 400);
    }

    const currentModel = validation.model || 'deepseek-ai/DeepSeek-V3.2';
    const strategy = getModelStrategy(currentModel);

    const payload: any = {
      model: currentModel,
      messages: validation.messages,
      stream: true,
    };

    // Precision injection based on specific model capabilities.
    // This prevents strict models like MiniMax from rejecting requests with unknown parameters.
    if (strategy === 'root_boolean') {
      payload.enable_thinking = validation.enableThinking;
    } else if (strategy === 'kwargs_dict') {
      payload.chat_template_kwargs = { 
        thinking: validation.enableThinking,
        enable_thinking: validation.enableThinking // Fallback for older engines within kwargs
      };
    } else if (strategy === 'native_always_on') {
      // The model natively outputs reasoning content and is STRICT.
      // Do NOT inject any thinking parameters to avoid 400 Bad Request.
    }

    const res = await fetchWithTimeout('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }, 45_000);

    if (!res.ok) {
      const upstreamBody = await res.text();
      console.error('[chat upstream]', res.status, upstreamBody.slice(0, 500));
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

                // Stream simplified protocol: { r: reasoning, c: content }
                if (delta.reasoning_content) {
                  controller.enqueue(encoder.encode(JSON.stringify({ r: delta.reasoning_content }) + '\n'));
                }
                if (delta.content) {
                  controller.enqueue(encoder.encode(JSON.stringify({ c: delta.content }) + '\n'));
                }
              } catch (e) { }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error: any) {
    if (isAbortError(error)) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504);
    }
    console.error('Chat API Error:', error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
