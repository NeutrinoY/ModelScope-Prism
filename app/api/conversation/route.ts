import type { NextRequest } from 'next/server';
import OpenAI from 'openai';
import {
  attachRequestId,
  applyRateLimit,
  createRequestId,
  extractApiKey,
  isAbortError,
  jsonError,
  parseJsonBody,
  sanitizeUpstreamStatus,
} from '@/lib/api-security';
import { apiConfig } from '@/lib/config';
import {
  parseConversationRequestBody,
  resolveConversationThinkingIntent,
} from '@/lib/conversation-request';
import type { ConversationMessage } from '@/lib/model-capabilities';
import { createModelScopeConversationStream } from '@/lib/modelscope/conversation';

export async function POST(req: NextRequest) {
  const requestId = createRequestId(req);
  const rateLimited = applyRateLimit(req, {
    routeKey: 'conversation',
    max: apiConfig.conversation.rateMax,
    windowMs: apiConfig.conversation.rateWindowMs,
  });
  if (rateLimited) return attachRequestId(rateLimited, requestId);

  try {
    const parsed = await parseJsonBody<unknown>(req, apiConfig.conversation.maxBodyBytes);
    if (!parsed.ok) return attachRequestId(parsed.response, requestId);

    const body = parseConversationRequestBody(parsed.data);
    if (!body.success) {
      return jsonError('INVALID_REQUEST', 'Conversation request body is invalid.', 400, {
        'X-Request-Id': requestId,
      });
    }

    // Security boundary: callers may provide the key in Authorization or request body for
    // this local-first app, but secrets are only read server-side and never persisted here.
    const apiKey = extractApiKey(req, body.data.apiKey);
    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'API Key is required.', 400, {
        'X-Request-Id': requestId,
      });
    }

    const stream = await createModelScopeConversationStream({
      apiKey,
      model: body.data.model,
      messages: body.data.messages as ConversationMessage[],
      thinkingIntent: resolveConversationThinkingIntent(body.data),
      timeoutMs: apiConfig.conversation.timeoutMs,
      signal: req.signal,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    if (isAbortError(error) || error instanceof OpenAI.APIConnectionTimeoutError) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504, {
        'X-Request-Id': requestId,
      });
    }

    if (error instanceof OpenAI.APIError) {
      console.error('[conversation upstream]', requestId, error.status, error.message);
      return jsonError(
        'UPSTREAM_ERROR',
        'Model provider request failed.',
        sanitizeUpstreamStatus(error.status ?? 500),
        { 'X-Request-Id': requestId }
      );
    }

    if (error instanceof Error && error.message.includes('does not support image')) {
      return jsonError('UNSUPPORTED_MODEL_CAPABILITY', error.message, 400, {
        'X-Request-Id': requestId,
      });
    }

    console.error('Conversation API Error:', requestId, error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500, {
      'X-Request-Id': requestId,
    });
  }
}
