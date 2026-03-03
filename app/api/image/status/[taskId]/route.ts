import { NextRequest } from 'next/server';
import {
  applyRateLimit,
  fetchWithTimeout,
  isAbortError,
  jsonError,
  sanitizeUpstreamStatus,
} from '@/lib/api-security';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const rateLimited = applyRateLimit(req, { routeKey: 'image-status', max: 120, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  try {
    const { taskId } = await params
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(taskId)) {
      return jsonError('INVALID_TASK_ID', 'taskId format is invalid.', 400);
    }

    const authHeader = req.headers.get('authorization') || '';
    const apiKey = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : authHeader.trim();

    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'API Key is required.', 400);
    }

    const response = await fetchWithTimeout(`https://api-inference.modelscope.cn/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-ModelScope-Task-Type': 'image_generation'
      }
    }, 20_000);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[image status upstream]', response.status, responseText.slice(0, 500));
      return jsonError(
        'UPSTREAM_ERROR',
        'Model provider request failed.',
        sanitizeUpstreamStatus(response.status)
      );
    }

    const data = JSON.parse(responseText);
    
    return new Response(JSON.stringify({ 
      task_status: data.task_status, 
      output_images: data.output_images || [],
      raw: data 
    }), { status: 200 });

  } catch (error: any) {
    if (isAbortError(error)) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504);
    }
    console.error('Task Status Error:', error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500);
  }
}
