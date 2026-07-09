'use client';

import { Bot, User } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { ReasoningBlock } from '@/components/shared/reasoning-block';
import type { ConversationMessage } from '@/lib/contracts';
import { cn } from '@/lib/utils';

/**
 * Shared message list for Chat and Vision: renders text and multimodal
 * messages, reasoning blocks, and a streaming placeholder. Near-bottom
 * auto-scroll keeps long streams readable without hijacking the user.
 */

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ConversationMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';
  const reasoning = 'reasoning' in message ? message.reasoning : undefined;

  return (
    <div className={cn('flex gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-border',
          isUser ? 'bg-primary text-primary-foreground border-transparent' : 'bg-surface-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-panel px-4 py-2.5 shadow-panel',
          isUser
            ? 'bg-accent-soft border border-accent/15'
            : 'bg-surface/80 border border-border/60'
        )}
      >
        {reasoning && <ReasoningBlock reasoning={reasoning} isStreaming={isStreaming} />}

        {Array.isArray(message.content) ? (
          <div className="space-y-3">
            {message.content.map((part, index) =>
              part.type === 'image_url' ? (
                <img
                  key={index}
                  src={part.image_url.url}
                  alt="Attached"
                  className="max-w-full max-h-80 rounded-lg border border-border shadow-sm"
                />
              ) : (
                <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
                  {part.text}
                </p>
              )
            )}
          </div>
        ) : isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  );
}

function StreamingPlaceholder() {
  return (
    <div className="flex gap-4">
      <div className="h-8 w-8 rounded-full bg-surface-muted border border-border shrink-0 flex items-center justify-center">
        <Bot className="h-4 w-4 text-text-muted" />
      </div>
      <div className="bg-surface/80 border border-border/60 rounded-panel px-4 py-3 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:240ms]" />
      </div>
    </div>
  );
}

export function ConversationMessageList({
  messages,
  isStreaming,
  emptyState,
  footer,
}: {
  messages: ConversationMessage[];
  isStreaming: boolean;
  emptyState?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom || !isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const waitingForFirstDelta =
    isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <div className="flex-1 relative min-h-0">
      <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto p-4">
        <div className="space-y-6 min-h-full max-w-3xl mx-auto relative">
          {messages.length === 0 && emptyState}

          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              isStreaming={
                isStreaming && index === messages.length - 1 && message.role === 'assistant'
              }
            />
          ))}

          {waitingForFirstDelta && <StreamingPlaceholder />}

          {footer}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}
