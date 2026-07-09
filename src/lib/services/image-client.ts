import type { ImageGenerateResponse, ImageGenerationRequest, ImageTaskStatus } from '../contracts';
import { toClientError } from './conversation-client';

/**
 * Frontend client for AIGC routes: task submission and status polling.
 */

export async function submitImageTask(
  request: ImageGenerationRequest,
  apiKey: string,
  signal?: AbortSignal
): Promise<ImageGenerateResponse> {
  const response = await fetch('/api/image/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw await toClientError(response);
  }
  return (await response.json()) as ImageGenerateResponse;
}

export async function getImageTaskStatus(
  taskId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<ImageTaskStatus> {
  const response = await fetch(`/api/image/status/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw await toClientError(response);
  }
  return (await response.json()) as ImageTaskStatus;
}
