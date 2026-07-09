import type { NextRequest } from 'next/server';
import {
  applyRateLimit,
  attachRequestId,
  createRequestId,
  extractApiKey,
  jsonError,
} from '@/app/api/_lib/http';
import { apiConfig } from '@/lib/config/api';
import { fetchImageTaskStatus, isAbortError, ProviderError } from '@/lib/providers/modelscope';

export async function GET(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const requestId = createRequestId(req);
  const rateLimited = applyRateLimit(req, {
    routeKey: 'image-status',
    max: apiConfig.imageStatus.rateMax,
    windowMs: apiConfig.imageStatus.rateWindowMs,
  });
  if (rateLimited) return attachRequestId(rateLimited, requestId);

  try {
    const { taskId } = await params;
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(taskId)) {
      return jsonError('INVALID_REQUEST', 'taskId format is invalid.', 400, {
        'X-Request-Id': requestId,
      });
    }

    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'ModelScope access token is required.', 400, {
        'X-Request-Id': requestId,
      });
    }

    const status = await fetchImageTaskStatus({
      apiKey,
      taskId,
      timeoutMs: apiConfig.imageStatus.timeoutMs,
    });

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error('[image status upstream]', requestId, error.code, error.upstreamMessage);
      return jsonError(error.code, error.message, error.status, { 'X-Request-Id': requestId });
    }
    if (isAbortError(error)) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504, {
        'X-Request-Id': requestId,
      });
    }
    console.error('[image status]', requestId, error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500, {
      'X-Request-Id': requestId,
    });
  }
}
