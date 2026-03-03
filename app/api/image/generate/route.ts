import { NextRequest } from 'next/server';
import {
  attachRequestId,
  applyRateLimit,
  createRequestId,
  extractApiKey,
  fetchWithTimeout,
  isAbortError,
  jsonError,
  parseJsonBody,
  sanitizeUpstreamStatus,
} from '@/lib/api-security';
import { apiConfig } from '@/lib/config';

// export const runtime = 'edge';

type ImageGenerateBody = {
  prompt?: unknown;
  negative_prompt?: unknown;
  image_url?: unknown;
  size?: unknown;
  model?: unknown;
  apiKey?: unknown;
  steps?: unknown;
  guidance?: unknown;
  seed?: unknown;
  loras?: unknown;
};

function validateImageGenerateBody(body: ImageGenerateBody): {
  ok: true;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  size: string;
  model?: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  loras?: string | Record<string, number>;
} | {
  ok: false;
  response: Response;
} {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 2000) {
    return { ok: false, response: jsonError('INVALID_PROMPT', 'prompt is required and must be <= 2000 chars.', 400) };
  }

  const negativePrompt = typeof body.negative_prompt === 'string' ? body.negative_prompt.trim() : undefined;
  if (negativePrompt && negativePrompt.length > 2000) {
    return { ok: false, response: jsonError('INVALID_NEGATIVE_PROMPT', 'negative_prompt must be <= 2000 chars.', 400) };
  }

  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : undefined;
  if (imageUrl) {
    const isHttp = /^https?:\/\/\S+$/i.test(imageUrl);
    const isBase64DataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(imageUrl);
    if (!isHttp && !isBase64DataUrl) {
      return { ok: false, response: jsonError('INVALID_IMAGE_URL', 'image_url must be a public URL or data:image base64.', 400) };
    }
  }

  const size = typeof body.size === 'string' ? body.size.trim() : '1024x1024';
  const sizeMatch = /^(\d{2,5})x(\d{2,5})$/.exec(size);
  if (!sizeMatch) {
    return { ok: false, response: jsonError('INVALID_SIZE', 'size must be in WIDTHxHEIGHT format.', 400) };
  }
  const width = Number(sizeMatch[1]);
  const height = Number(sizeMatch[2]);
  if (width < 64 || width > 2048 || height < 64 || height > 2048) {
    return { ok: false, response: jsonError('INVALID_SIZE', 'image size must be between 64 and 2048.', 400) };
  }

  const model = typeof body.model === 'string' ? body.model.trim() : undefined;
  if (model && model.length > 120) {
    return { ok: false, response: jsonError('INVALID_MODEL', 'model id is too long.', 400) };
  }

  const steps = typeof body.steps === 'number' ? body.steps : undefined;
  if (steps !== undefined && (!Number.isInteger(steps) || steps < 1 || steps > 100)) {
    return { ok: false, response: jsonError('INVALID_STEPS', 'steps must be an integer between 1 and 100.', 400) };
  }

  const guidance = typeof body.guidance === 'number' ? body.guidance : undefined;
  if (guidance !== undefined && (guidance < 1.5 || guidance > 20)) {
    return { ok: false, response: jsonError('INVALID_GUIDANCE', 'guidance must be between 1.5 and 20.', 400) };
  }

  const seed = typeof body.seed === 'number' ? body.seed : undefined;
  if (seed !== undefined && (!Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647)) {
    return { ok: false, response: jsonError('INVALID_SEED', 'seed must be a positive 32-bit integer.', 400) };
  }

  let loras: string | Record<string, number> | undefined;
  if (typeof body.loras === 'string') {
    loras = body.loras.trim();
    if (!loras || loras.length > 200) {
      return { ok: false, response: jsonError('INVALID_LORAS', 'loras string is invalid.', 400) };
    }
  } else if (body.loras && typeof body.loras === 'object' && !Array.isArray(body.loras)) {
    const entries = Object.entries(body.loras as Record<string, unknown>);
    if (entries.length < 1 || entries.length > 6) {
      return { ok: false, response: jsonError('INVALID_LORAS', 'loras object must contain 1 to 6 entries.', 400) };
    }
    const parsedLoras: Record<string, number> = {};
    for (const [key, value] of entries) {
      const repo = key.trim();
      if (!repo || repo.length > 200) {
        return { ok: false, response: jsonError('INVALID_LORAS', 'loras repo id is invalid.', 400) };
      }
      if (typeof value !== 'number' || value < 0 || value > 1) {
        return { ok: false, response: jsonError('INVALID_LORAS', 'loras weight must be between 0 and 1.', 400) };
      }
      parsedLoras[repo] = value;
    }
    const totalWeight = Object.values(parsedLoras).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1) > 0.02) {
      return { ok: false, response: jsonError('INVALID_LORAS', 'multi-loras weights must sum to 1.0.', 400) };
    }
    loras = parsedLoras;
  }

  return { ok: true, prompt, negativePrompt, imageUrl, size, model, steps, guidance, seed, loras };
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId(req);
  const rateLimited = applyRateLimit(req, {
    routeKey: 'image-generate',
    max: apiConfig.imageGenerate.rateMax,
    windowMs: apiConfig.imageGenerate.rateWindowMs,
  });
  if (rateLimited) return attachRequestId(rateLimited, requestId);

  try {
    const parsed = await parseJsonBody<ImageGenerateBody>(req, apiConfig.imageGenerate.maxBodyBytes);
    if (!parsed.ok) return attachRequestId(parsed.response, requestId);

    const validation = validateImageGenerateBody(parsed.data);
    if (!validation.ok) return attachRequestId(validation.response, requestId);

    const apiKey = extractApiKey(req, parsed.data.apiKey);
    if (!apiKey) {
      return jsonError('MISSING_API_KEY', 'API Key is required.', 400, { 'X-Request-Id': requestId });
    }

    // ModelScope v1/images/generations payload
    const payload: any = {
      model: validation.model || 'Qwen/Qwen-Image',
      prompt: validation.prompt,
      n: 1,
      size: validation.size
    };

    if (validation.negativePrompt) payload.negative_prompt = validation.negativePrompt;
    if (validation.imageUrl) payload.image_url = validation.imageUrl;

    // Add optional advanced parameters
    if (validation.steps !== undefined) payload.steps = validation.steps;
    if (validation.guidance !== undefined) payload.guidance = validation.guidance;
    if (validation.seed !== undefined) payload.seed = validation.seed;
    if (validation.loras) payload.loras = validation.loras;

    let response;
    let responseText;
    let lastError;

    // Retry mechanism (max 3 attempts) for stability
    for (let attempt = 0; attempt < apiConfig.imageGenerate.maxRetries; attempt++) {
      try {
        response = await fetchWithTimeout('https://api-inference.modelscope.cn/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-ModelScope-Async-Mode': 'true'
          },
          body: JSON.stringify(payload)
        }, apiConfig.imageGenerate.timeoutMs);

        // Break on success or non-retriable client errors (4xx)
        if (response.ok || response.status < 500) {
           break; 
        } else {
           const txt = await response.text();
           throw new Error(`Server Error ${response.status}: ${txt}`);
        }
      } catch (err: any) {
        lastError = err;
        if (attempt < apiConfig.imageGenerate.maxRetries - 1) {
          await new Promise((res) => setTimeout(res, apiConfig.imageGenerate.retryDelayMs));
        }
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to connect to ModelScope API');
    }

    responseText = await response.text();

    if (!response.ok) {
      console.error('[image generate upstream]', requestId, response.status, responseText.slice(0, 500));
      return jsonError(
        'UPSTREAM_ERROR',
        'Model provider request failed.',
        sanitizeUpstreamStatus(response.status),
        { 'X-Request-Id': requestId }
      );
    }

    const data = JSON.parse(responseText);
    
    if (!data.task_id) {
       throw new Error('No task_id returned from API');
    }

    return new Response(JSON.stringify({ task_id: data.task_id }), {
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
    console.error('Image Generation Error:', requestId, error);
    return jsonError('INTERNAL_ERROR', 'Internal server error.', 500, { 'X-Request-Id': requestId });
  }
}
