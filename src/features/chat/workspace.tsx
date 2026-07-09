'use client';

import { Bot } from 'lucide-react';
import { ConversationComposer } from '@/components/shared/conversation/conversation-composer';
import { ConversationMessageList } from '@/components/shared/conversation/conversation-message-list';
import { ConversationModelSelector } from '@/components/shared/conversation/conversation-model-selector';
import { useConversationWorkspace } from '@/components/shared/conversation/use-conversation-workspace';
import { ErrorNotice } from '@/components/shared/error-notice';
import { openSettingsDialog } from '@/features/settings/hooks/use-settings-dialog';

/**
 * Chat workspace: text-first conversation. Images can be attached but are
 * not the main experience (docs/rebuild/01).
 */
export function ChatWorkspace() {
  const workspace = useConversationWorkspace('chat');

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative overflow-hidden h-full">
      <ConversationModelSelector
        modelId={workspace.modelId}
        onModelChange={workspace.setModelId}
        thinking={workspace.settings.thinking}
        hasMessages={workspace.messages.length > 0}
        onOpenSettings={openSettingsDialog}
        layoutId="chat-model-selector"
      />

      <ConversationMessageList
        messages={workspace.messages}
        isStreaming={workspace.isStreaming}
        emptyState={
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 absolute inset-0">
            <div className="p-4 rounded-full bg-surface-muted/60 border border-border">
              <Bot className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-medium">Chat</h2>
            <p className="text-sm max-w-xs">
              Streamed conversations with reasoning. Pick a model above or set a custom ID.
            </p>
          </div>
        }
        footer={
          workspace.error && (
            <ErrorNotice
              error={workspace.error}
              isRetrying={workspace.isStreaming}
              onOpenSettings={openSettingsDialog}
              onRetry={workspace.retry}
            />
          )
        }
      />

      <ConversationComposer
        modelId={workspace.modelId}
        settings={workspace.settings}
        onSettingsChange={workspace.updateSettings}
        isStreaming={workspace.isStreaming}
        onSubmit={workspace.submit}
        onStop={workspace.stop}
        placeholder="Message the model…"
        imageLabel="Attach images"
        imageHint="Images are sent as image_url content parts. Prism does not verify the model accepts image input."
      />
    </div>
  );
}
