import type { NextRequest } from 'next/server';
import {
  applyRateLimit,
  attachRequestId,
  createRequestId,
  extractApiKey,
  jsonError,
  parseJsonBody,
} from '@/app/api/_lib/http';
import { apiConfig } from '@/lib/config/api';
import { conversationRequestSchema } from '@/lib/contracts';
import { createConversationStream, isAbortError, ProviderError } from '@/lib/providers/modelscope';

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

    const body = conversationRequestSchema.safeParse(parsed.data);
    if (!body.success) {
      return jsonError('INVALID_REQUEST', 'Conversation request body is invalid.', 400, {
        'X-Request-Id': requestId,
      });
    }

    // Token boundary: read for this request only, never persisted here.
    const apiKey = extractApiKey(req, body.data.apiKey);
    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'ModelScope access token is required.', 400, {
        'X-Request-Id': requestId,
      });
    }

    const stream = await createConversationStream({
      apiKey,
      request: body.data,
      timeoutMs: apiConfig.conversation.timeoutMs,
      signal: req.signal,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error('[conversation upstream]', requestId, error.code, error.upstreamMessage);
      return jsonError(error.code, error.message, error.status, { 'X-Request-Id': requestId });
    }
    if (isAbortError(error)) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504, {
        'X-Request-Id': requestId,
      });
    }
    console.error('[conversation]', requestId, error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500, {
      'X-Request-Id': requestId,
    });
  }
}
