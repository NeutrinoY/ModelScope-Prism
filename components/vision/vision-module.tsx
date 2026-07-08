'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore, type Message, type VisionSessionData } from '@/lib/store';
import {
  Send,
  User,
  Bot,
  Loader2,
  Image as ImageIcon,
  ChevronRight,
  BrainCircuit,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStreamSessionRunner } from '@/hooks/use-stream-session-runner';
import { ReferenceImageInput } from '@/components/shared/reference-image-input';
import { requestConversationStream } from '@/lib/services/conversation-service';
import { getModelProfile } from '@/lib/model-capabilities';

export function VisionModule() {
  const {
    apiKey,
    visionModelId,
    sessions,
    activeSessionId,
    updateSessionData,
    createSession,
    renameSession,
    customThinkingIntent,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { isLoading, start, stop } = useStreamSessionRunner();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = activeSessionId ? sessions[activeSessionId] : null;
  const messages = (
    currentSession?.type === 'vision' ? (currentSession.data as VisionSessionData).messages : []
  ) as Message[];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [input]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (isNearBottom || !isLoading) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStop = () => stop();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;
    if (!apiKey) {
      toast.error('Please set your API Key in settings first');
      document.dispatchEvent(new CustomEvent('open-settings'));
      return;
    }

    let sessionId = activeSessionId;
    let isNewSession = false;

    if (currentSession?.type !== 'vision') {
      sessionId = createSession('vision');
      isNewSession = true;
    }
    if (!sessionId) return;

    const userContent: any[] = [];
    if (selectedImage) {
      userContent.push({ type: 'image_url', image_url: { url: selectedImage } });
    }
    userContent.push({ type: 'text', text: input || 'Describe this image' });

    const userMessage: Message = { role: 'user', content: userContent };
    const updatedMessages = [...messages, userMessage];

    updateSessionData(sessionId, { messages: updatedMessages });

    if (isNewSession) {
      renameSession(sessionId, input ? input.slice(0, 30) : 'Image Analysis');
    }

    setInput('');
    setSelectedImage(null);

    const profile = getModelProfile(visionModelId);
    const thinkingIntent = profile.source === 'custom' ? customThinkingIntent : 'on';

    try {
      let assistantContent = '';
      let assistantReasoning = '';
      const syncAssistant = () => {
        updateSessionData(sessionId, {
          messages: [
            ...updatedMessages,
            {
              role: 'assistant',
              content: assistantContent,
              ...(assistantReasoning ? { reasoning: assistantReasoning } : {}),
            },
          ],
        });
      };

      await start({
        request: (signal) =>
          requestConversationStream(
            {
              messages: updatedMessages,
              model: visionModelId,
              apiKey: apiKey,
              thinkingIntent,
            },
            signal
          ),
        allowPlainTextFallback: true,
        onDelta: (data) => {
          if (data.r) assistantReasoning += data.r;
          if (data.c) assistantContent += data.c;
          syncAssistant();
        },
        onPlainText: (text) => {
          assistantContent += text;
          syncAssistant();
        },
        onNotice: (notice) => toast.info(notice.message),
        onError: (message) => toast.error(message || 'Failed to analyze image'),
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze image');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative overflow-hidden h-full">
      {/* Chat History - Full immersion with strict height control */}
      <div className="flex-1 relative min-h-0">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto p-4">
          <div className="space-y-6 min-h-full max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 absolute inset-0">
                <div className="p-4 rounded-full bg-muted/50 border border-border/50">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-medium">Vision Analyst</h2>
                  <p className="text-sm">Describe, analyze, or read text from images</p>
                  <p className="text-[10px] mt-2 font-mono uppercase tracking-widest">
                    {visionModelId.split('/').pop()}
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-4', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-border/50 shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground border-none'
                      : 'bg-muted'
                  )}
                >
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm overflow-hidden',
                    msg.role === 'user'
                      ? 'bg-primary/10 text-foreground border border-primary/20'
                      : 'bg-muted/30 border border-border/30'
                  )}
                >
                  {Array.isArray(msg.content) ? (
                    <div className="space-y-3">
                      {msg.content.map((item, idx) =>
                        item.type === 'image_url' ? (
                          <img
                            key={idx}
                            src={item.image_url.url}
                            alt="Uploaded"
                            className="max-w-full rounded-lg border border-border/50 shadow-sm"
                          />
                        ) : (
                          <p key={idx} className="text-sm leading-relaxed">
                            {item.text}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Reasoning Block */}
                      {msg.reasoning && (
                        <div className="mb-3 border-l-2 border-primary/20 pl-3 py-1">
                          <details className="group" open={isLoading && i === messages.length - 1}>
                            <summary className="text-[11px] font-medium text-muted-foreground cursor-pointer list-none flex items-center gap-1.5 hover:text-primary transition-colors">
                              <BrainCircuit className="h-3 w-3" />
                              <span>
                                {isLoading && i === messages.length - 1
                                  ? 'Thinking...'
                                  : 'Deep Thought Process'}
                              </span>
                              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80 font-mono whitespace-pre-wrap">
                              {msg.reasoning}
                            </div>
                          </details>
                        </div>
                      )}
                      <MarkdownRenderer content={msg.content as string} />
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border/50 animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-2xl px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="w-full px-4 pt-2 pb-2 z-30">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <form
            onSubmit={handleSubmit}
            className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-2xl focus-within:border-primary/50 transition-all group flex items-end gap-2"
          >
            <ReferenceImageInput
              compact
              value={selectedImage || ''}
              onChange={(next) => setSelectedImage(next || null)}
              uploadQuality={0.8}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's in this image?"
              rows={1}
              className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-2 text-base leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
            />
            {isLoading ? (
              <Button
                type="button"
                onClick={handleStop}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl transition-all mb-0.5 bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() && !selectedImage}
                className="h-9 w-9 shrink-0 rounded-xl transition-all active:scale-95 mb-0.5"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}{' '}
          </form>
        </div>
      </div>
    </div>
  );
}
