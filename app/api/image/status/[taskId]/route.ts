import { NextRequest } from 'next/server';
import {
  attachRequestId,
  applyRateLimit,
  createRequestId,
  fetchWithTimeout,
  isAbortError,
  jsonError,
  sanitizeUpstreamStatus,
} from '@/lib/api-security';
import { apiConfig } from '@/lib/config';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = createRequestId(req);
  const rateLimited = applyRateLimit(req, {
    routeKey: 'image-status',
    max: apiConfig.imageStatus.rateMax,
    windowMs: apiConfig.imageStatus.rateWindowMs,
  });
  if (rateLimited) return attachRequestId(rateLimited, requestId);

  try {
    const { taskId } = await params
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(taskId)) {
      return jsonError('INVALID_TASK_ID', 'taskId format is invalid.', 400, { 'X-Request-Id': requestId });
    }

    const authHeader = req.headers.get('authorization') || '';
    const apiKey = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : authHeader.trim();

    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'API Key is required.', 400, { 'X-Request-Id': requestId });
    }

    const response = await fetchWithTimeout(`https://api-inference.modelscope.cn/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-ModelScope-Task-Type': 'image_generation'
      }
    }, apiConfig.imageStatus.timeoutMs);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[image status upstream]', requestId, response.status, responseText.slice(0, 500));
      return jsonError(
        'UPSTREAM_ERROR',
        'Model provider request failed.',
        sanitizeUpstreamStatus(response.status),
        { 'X-Request-Id': requestId }
      );
    }

    const data = JSON.parse(responseText);
    
    return new Response(JSON.stringify({ 
      task_status: data.task_status, 
      output_images: data.output_images || [],
      raw: data 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Request-Id': requestId,
      }
    });

  } catch (error: any) {
    if (isAbortError(error)) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504, { 'X-Request-Id': requestId });
    }
    console.error('Task Status Error:', requestId, error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500, { 'X-Request-Id': requestId });
  }
}
