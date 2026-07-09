import type { ImageGenerateResponse, ImageGenerationRequest } from '../../contracts';
import { fromNetworkError, fromUpstreamResponse, ProviderError } from './errors';
import { buildImageGenerationPayload, MODELSCOPE_BASE_URL } from './payloads';

/**
 * ModelScope AIGC provider: submit async image generation tasks.
 * X-ModelScope-Async-Mode is a product-shape header fixed here.
 */

export type ImageGenerationOptions = {
  apiKey: string;
  request: ImageGenerationRequest;
  timeoutMs: number;
};

export async function submitImageGeneration(
  options: ImageGenerationOptions
): Promise<ImageGenerateResponse> {
  const payload = buildImageGenerationPayload(options.request);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${MODELSCOPE_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'X-ModelScope-Async-Mode': 'true',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    throw fromNetworkError(error);
  } finally {
    clearTimeout(timer);
  }

  const bodyText = await response.text();
  if (!response.ok) {
    throw fromUpstreamResponse(response.status, bodyText);
  }

  let data: { task_id?: string; request_id?: string };
  try {
    data = JSON.parse(bodyText) as { task_id?: string; request_id?: string };
  } catch {
    throw new ProviderError('UPSTREAM_ERROR', 502, 'Invalid JSON from image generation API.');
  }

  if (!data.task_id) {
    throw new ProviderError('UPSTREAM_ERROR', 502, 'No task_id returned from image generation.');
  }

  const result: ImageGenerateResponse = { taskId: data.task_id };
  if (data.request_id) result.requestId = data.request_id;
  return result;
}
