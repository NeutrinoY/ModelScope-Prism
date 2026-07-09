import type { ImageTaskStatus } from '../../contracts';
import { createPrismError } from '../../domain';
import { fromNetworkError, fromUpstreamResponse, ProviderError } from './errors';
import { MODELSCOPE_BASE_URL } from './payloads';

/**
 * ModelScope task status provider: poll GET /v1/tasks/{task_id} and
 * converge the upstream task_status vocabulary into ImageTaskStatus.
 * X-ModelScope-Task-Type is a product-shape header fixed here.
 */

export type TaskStatusOptions = {
  apiKey: string;
  taskId: string;
  timeoutMs: number;
};

type UpstreamTaskResponse = {
  task_status?: string;
  output_images?: unknown;
  errors?: { message?: string };
  message?: string;
};

export async function fetchImageTaskStatus(options: TaskStatusOptions): Promise<ImageTaskStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${MODELSCOPE_BASE_URL}/tasks/${options.taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'X-ModelScope-Task-Type': 'image_generation',
      },
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

  let data: UpstreamTaskResponse;
  try {
    data = JSON.parse(bodyText) as UpstreamTaskResponse;
  } catch {
    throw new ProviderError('UPSTREAM_ERROR', 502, 'Invalid JSON from task status API.');
  }

  const status = (data.task_status ?? '').toUpperCase();

  if (status === 'SUCCEED' || status === 'SUCCEEDED' || status === 'SUCCESS') {
    const outputImages = Array.isArray(data.output_images)
      ? data.output_images.filter((url): url is string => typeof url === 'string')
      : [];
    return { status: 'succeeded', taskId: options.taskId, outputImages };
  }

  if (status === 'FAILED' || status === 'FAIL' || status === 'CANCELED') {
    const upstreamMessage = data.errors?.message ?? data.message;
    return {
      status: 'failed',
      taskId: options.taskId,
      error: createPrismError(
        'TASK_FAILED',
        'The generation task failed upstream.',
        upstreamMessage ? { upstream: upstreamMessage } : undefined
      ),
    };
  }

  if (status === 'PENDING' || status === 'QUEUED' || status === 'WAITING') {
    return { status: 'pending', taskId: options.taskId };
  }

  // PROCESSING / RUNNING and any unrecognized in-flight status
  return { status: 'running', taskId: options.taskId };
}
