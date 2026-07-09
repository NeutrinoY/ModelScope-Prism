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
import { imageGenerationRequestSchema } from '@/lib/contracts';
import { validateLoraRequest } from '@/lib/domain';
import { isAbortError, ProviderError, submitImageGeneration } from '@/lib/providers/modelscope';

export async function POST(req: NextRequest) {
  const requestId = createRequestId(req);
  const rateLimited = applyRateLimit(req, {
    routeKey: 'image-generate',
    max: apiConfig.imageGenerate.rateMax,
    windowMs: apiConfig.imageGenerate.rateWindowMs,
  });
  if (rateLimited) return attachRequestId(rateLimited, requestId);

  try {
    const parsed = await parseJsonBody<unknown>(req, apiConfig.imageGenerate.maxBodyBytes);
    if (!parsed.ok) return attachRequestId(parsed.response, requestId);

    const body = imageGenerationRequestSchema.safeParse(parsed.data);
    if (!body.success) {
      return jsonError('INVALID_REQUEST', 'Image generation request body is invalid.', 400, {
        'X-Request-Id': requestId,
      });
    }

    const loras = body.data.advanced?.loras;
    if (loras) {
      const loraCheck = validateLoraRequest(loras);
      if (!loraCheck.ok) {
        return jsonError('INVALID_REQUEST', `LoRA request is invalid: ${loraCheck.reason}.`, 400, {
          'X-Request-Id': requestId,
        });
      }
    }

    const apiKey = extractApiKey(req, body.data.apiKey);
    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'ModelScope access token is required.', 400, {
        'X-Request-Id': requestId,
      });
    }

    const result = await submitImageGeneration({
      apiKey,
      request: body.data,
      timeoutMs: apiConfig.imageGenerate.timeoutMs,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error('[image generate upstream]', requestId, error.code, error.upstreamMessage);
      return jsonError(error.code, error.message, error.status, { 'X-Request-Id': requestId });
    }
    if (isAbortError(error)) {
      return jsonError('UPSTREAM_TIMEOUT', 'Upstream request timed out.', 504, {
        'X-Request-Id': requestId,
      });
    }
    console.error('[image generate]', requestId, error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500, {
      'X-Request-Id': requestId,
    });
  }
}
