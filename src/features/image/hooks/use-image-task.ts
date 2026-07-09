'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { WorkspaceError } from '@/components/shared/error-notice';
import type {
  ActiveImageTask,
  GeneratedImage,
  ImageGenerationRequest,
  ImageRequestMeta,
} from '@/lib/contracts';
import { IMAGE_TASK_POLLING } from '@/lib/config/limits';
import { ClientError, getImageTaskStatus, submitImageTask } from '@/lib/services';
import { usePrismStore } from '@/lib/storage';

/**
 * AIGC async task lifecycle (docs/rebuild/03): submit -> poll with backoff
 * -> succeed/fail/timeout. The active task persists in the store so a
 * refresh can resume polling within the timeout window.
 */

export type ImageTaskPhase =
  | 'idle'
  | 'submitting'
  | 'polling'
  | 'succeeded'
  | 'failed'
  | 'timed_out';

export function useImageTask() {
  const activeTask = usePrismStore((state) => state.activeImageTask);
  const [phase, setPhase] = useState<ImageTaskPhase>(activeTask ? 'polling' : 'idle');
  const [error, setError] = useState<WorkspaceError | null>(null);
  const requestMetaRef = useRef<ImageRequestMeta | null>(null);

  const clearTask = useCallback((nextPhase: ImageTaskPhase) => {
    usePrismStore.getState().setActiveImageTask(null);
    setPhase(nextPhase);
  }, []);

  // Resume-on-load: clean up tasks that outlived the polling window.
  useEffect(() => {
    if (!activeTask) return;
    const age = Date.now() - activeTask.startedAt;
    if (age > IMAGE_TASK_POLLING.maxDurationMs) {
      clearTask('idle');
      return;
    }
    setPhase('polling');
  }, []);

  // Polling loop with backoff, bound to the current active task.
  useEffect(() => {
    if (!activeTask || phase !== 'polling') return;

    const { secrets } = usePrismStore.getState();
    const apiKey = secrets.apiKey ?? '';
    if (!apiKey) {
      setError({ code: 'MISSING_API_KEY' });
      clearTask('failed');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finishWithImages = (urls: string[]) => {
      const store = usePrismStore.getState();
      const meta = requestMetaRef.current;
      for (const url of urls) {
        const image: GeneratedImage = {
          id: crypto.randomUUID(),
          url,
          prompt: activeTask.prompt,
          modelId: activeTask.modelId,
          createdAt: Date.now(),
          ...(meta?.size ? { size: meta.size } : {}),
          ...(meta ? { requestMeta: meta } : {}),
        };
        store.addGeneratedImage(activeTask.sessionId, image);
      }
      toast.success('Image generated');
      clearTask('succeeded');
    };

    const schedule = (attempt: number) => {
      const delays = IMAGE_TASK_POLLING.delaysMs;
      const delay = delays[Math.min(attempt, delays.length - 1)];
      timer = setTimeout(async () => {
        if (cancelled) return;

        if (Date.now() - activeTask.startedAt > IMAGE_TASK_POLLING.maxDurationMs) {
          setError({ code: 'UPSTREAM_TIMEOUT', message: 'The generation task timed out.' });
          clearTask('timed_out');
          return;
        }

        try {
          const status = await getImageTaskStatus(activeTask.taskId, apiKey);
          if (cancelled) return;

          if (status.status === 'succeeded') {
            if (status.outputImages.length > 0) {
              finishWithImages(status.outputImages);
            } else {
              setError({ code: 'TASK_FAILED', message: 'The task finished without images.' });
              clearTask('failed');
            }
            return;
          }
          if (status.status === 'failed') {
            setError({
              code: status.error?.error.code ?? 'TASK_FAILED',
              ...(status.error?.error.message ? { message: status.error.error.message } : {}),
            });
            clearTask('failed');
            return;
          }
          schedule(attempt + 1);
        } catch (caught) {
          if (cancelled) return;
          // Transient polling errors: keep trying inside the window.
          if (caught instanceof ClientError && caught.code === 'AUTH_FAILED') {
            setError({ code: 'AUTH_FAILED' });
            clearTask('failed');
            return;
          }
          schedule(attempt + 1);
        }
      }, delay);
    };

    schedule(0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeTask, phase, clearTask]);

  const submit = useCallback(async (request: ImageGenerationRequest, sessionId: string) => {
    const store = usePrismStore.getState();
    const apiKey = store.secrets.apiKey ?? '';
    if (!apiKey) {
      setError({ code: 'MISSING_API_KEY' });
      return false;
    }

    setError(null);
    setPhase('submitting');

    const meta: ImageRequestMeta = {
      modelId: request.model,
      prompt: request.prompt,
      createdAt: Date.now(),
      ...(request.negativePrompt?.trim() ? { negativePrompt: request.negativePrompt.trim() } : {}),
      ...(request.size?.enabled ? { size: request.size.value } : {}),
      ...(request.advanced?.seed?.enabled ? { seed: request.advanced.seed.value } : {}),
      ...(request.advanced?.steps?.enabled ? { steps: request.advanced.steps.value } : {}),
      ...(request.advanced?.guidance?.enabled ? { guidance: request.advanced.guidance.value } : {}),
      ...(request.imageInput?.length ? { imageInputCount: request.imageInput.length } : {}),
      ...(request.advanced?.loras?.items.length ? { loras: request.advanced.loras.items } : {}),
    };
    requestMetaRef.current = meta;

    try {
      const response = await submitImageTask(request, apiKey);
      const task: ActiveImageTask = {
        taskId: response.taskId,
        sessionId,
        modelId: request.model,
        prompt: request.prompt,
        startedAt: Date.now(),
      };
      store.setActiveImageTask(task);
      setPhase('polling');
      toast.info('Task submitted — generating…');
      return true;
    } catch (caught) {
      if (caught instanceof ClientError) {
        setError({
          code: caught.code,
          message: caught.message,
          ...(caught.requestId ? { requestId: caught.requestId } : {}),
        });
      } else {
        setError({ code: 'NETWORK_ERROR' });
      }
      setPhase('failed');
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (phase === 'failed' || phase === 'timed_out') setPhase('idle');
  }, [phase]);

  const isGenerating = phase === 'submitting' || phase === 'polling';

  return { phase, isGenerating, error, activeTask, submit, clearError };
}
