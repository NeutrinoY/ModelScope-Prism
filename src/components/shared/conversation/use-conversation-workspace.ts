'use client';

import { useCallback } from 'react';
import type { ComposerSubmitPayload } from '@/components/shared/conversation/conversation-composer';
import { useConversationRunner } from '@/components/shared/conversation/use-conversation-runner';
import type { ChatSession, VisionSession } from '@/lib/contracts';
import { buildUserMessage, deriveSessionTitle, isDefaultTitle } from '@/lib/domain';
import { selectActiveSession, usePrismStore } from '@/lib/storage';

/**
 * Shared workspace glue for Chat and Vision: resolves the active session,
 * creates one on first send, appends the user message, derives the title,
 * and hands off to the conversation runner.
 */
export function useConversationWorkspace(workspace: 'chat' | 'vision') {
  const session = usePrismStore((state) => selectActiveSession(state, workspace)) as
    | ChatSession
    | VisionSession
    | null;
  const modelDefaults = usePrismStore((state) => state.settings.modelDefaults);
  const conversationDefaults = usePrismStore((state) => state.settings.conversationDefaults);

  const runner = useConversationRunner();

  const modelId =
    session?.modelId ??
    (workspace === 'chat' ? modelDefaults.chatModelId : modelDefaults.visionModelId);
  const settings = session?.settings ?? conversationDefaults;
  const messages = session?.messages ?? [];

  const setModelId = useCallback(
    (nextModelId: string) => {
      const store = usePrismStore.getState();
      const active = selectActiveSession(store, workspace);
      if (active) {
        store.setSessionModelId(active.id, nextModelId);
      } else {
        store.updateSettings({
          modelDefaults: {
            ...store.settings.modelDefaults,
            [workspace === 'chat' ? 'chatModelId' : 'visionModelId']: nextModelId,
          },
        });
      }
    },
    [workspace]
  );

  const updateSettings = useCallback(
    (update: Partial<typeof conversationDefaults>) => {
      const store = usePrismStore.getState();
      const active = selectActiveSession(store, workspace);
      if (active) {
        store.updateConversationSessionSettings(active.id, update);
      } else {
        store.updateSettings({
          conversationDefaults: { ...store.settings.conversationDefaults, ...update },
        });
      }
    },
    [workspace]
  );

  const submit = useCallback(
    (payload: ComposerSubmitPayload) => {
      const store = usePrismStore.getState();
      let active = selectActiveSession(store, workspace) as ChatSession | VisionSession | null;

      if (!active) {
        const id = store.createSession(workspace, modelId);
        active = usePrismStore.getState().sessions[id] as ChatSession | VisionSession;
      }

      const userMessage = buildUserMessage(payload.text, payload.images);
      const nextMessages = [...active.messages, userMessage];
      store.setSessionMessages(active.id, nextMessages);

      if (isDefaultTitle(active.title) && payload.text) {
        store.renameSession(active.id, deriveSessionTitle(payload.text));
      }

      void runner.send({
        sessionId: active.id,
        modelId: active.modelId,
        messages: nextMessages,
        settings: active.settings,
      });
    },
    [workspace, modelId, runner.send]
  );

  return {
    session,
    modelId,
    settings,
    messages,
    setModelId,
    updateSettings,
    submit,
    isStreaming: runner.isStreaming,
    error: runner.error,
    stop: runner.stop,
    clearError: runner.clearError,
  };
}
