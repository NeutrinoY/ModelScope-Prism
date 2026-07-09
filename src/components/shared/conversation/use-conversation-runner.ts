'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { WorkspaceError } from '@/components/shared/error-notice';
import type {
  ConversationMessage,
  ConversationSessionSettings,
  TextConversationMessage,
} from '@/lib/contracts';
import {
  getModelProfile,
  resolveOutputLimitParam,
  resolveVisibleThinkingFormat,
} from '@/lib/domain';
import { ClientError, streamConversation } from '@/lib/services';
import { usePrismStore } from '@/lib/storage';

/**
 * Conversation streaming lifecycle shared by Chat and Vision. Builds the
 * domain-level ConversationRequest from the session's explicit settings,
 * streams deltas into the store, and exposes stop/error state.
 */

export type SendOptions = {
  sessionId: string;
  modelId: string;
  messages: ConversationMessage[];
  settings: ConversationSessionSettings;
};

export function useConversationRunner() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<WorkspaceError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const send = useCallback(async (options: SendOptions) => {
    const { apiKey, setSessionMessages } = usePrismStore.getState();
    if (!apiKey) {
      setError({ code: 'MISSING_API_KEY' });
      return;
    }

    setError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const profile = getModelProfile(options.modelId);
    const { thinking, outputLimit } = options.settings;

    // Explicit-send rule: auto -> omit the control entirely.
    const thinkingControl =
      thinking.mode === 'auto'
        ? undefined
        : {
            mode: thinking.mode,
            format: thinking.format ?? resolveVisibleThinkingFormat(profile) ?? 'enable_thinking',
          };

    const outputParam = resolveOutputLimitParam(profile);
    const outputLimitControl =
      outputLimit.enabled && outputParam
        ? { enabled: true, mode: outputLimit.mode, param: outputLimit.param ?? outputParam }
        : undefined;

    const requestMeta = {
      modelId: options.modelId,
      ...(thinkingControl ? { thinking: thinkingControl } : {}),
      ...(outputLimitControl ? { outputLimit: outputLimitControl } : {}),
      createdAt: Date.now(),
    };

    let content = '';
    let reasoning = '';

    const commit = () => {
      const assistant: TextConversationMessage = {
        role: 'assistant',
        content,
        ...(reasoning ? { reasoning } : {}),
        requestMeta,
      };
      setSessionMessages(options.sessionId, [...options.messages, assistant]);
    };

    try {
      await streamConversation(
        {
          model: options.modelId,
          messages: options.messages,
          ...(thinkingControl ? { thinking: thinkingControl } : {}),
          ...(outputLimitControl ? { outputLimit: outputLimitControl } : {}),
        },
        apiKey,
        {
          onDelta: (delta) => {
            if (delta.c) content += delta.c;
            if (delta.r) reasoning += delta.r;
            commit();
          },
          onNotice: (notice) => toast.info(notice.message),
        },
        controller.signal
      );
      // Nothing streamed at all — surface it instead of an empty bubble.
      if (!content && !reasoning) {
        commit();
      }
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') {
        // User pressed stop: keep whatever streamed so far.
        return;
      }
      if (content || reasoning) {
        commit();
      }
      if (caught instanceof ClientError) {
        setError({
          code: caught.code,
          message: caught.message,
          ...(caught.requestId ? { requestId: caught.requestId } : {}),
        });
      } else {
        setError({ code: 'NETWORK_ERROR' });
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isStreaming, error, send, stop, clearError };
}
