'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore, type Message, type ChatSessionData } from '@/lib/store';
import { getModelProfile, LLM_SERIES, type ThinkingIntent } from '@/lib/model-capabilities';
import {
  Send,
  User,
  Bot,
  Loader2,
  BrainCircuit,
  Settings2,
  ChevronRight,
  LayoutPanelTop,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { ReferenceImageInput } from '@/components/shared/reference-image-input';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStreamSessionRunner } from '@/hooks/use-stream-session-runner';
import { requestConversationStream } from '@/lib/services/conversation-service';

export function ChatModule() {
  const {
    apiKey,
    chatModelId,
    setChatModelId,
    sessions,
    activeSessionId,
    updateSessionData,
    createSession,
    customThinkingIntent,
    setCustomThinkingIntent,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [forceShowSelector, setForceShowSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading, start, stop } = useStreamSessionRunner();

  const [presetThinking, setPresetThinking] = useState<Record<string, boolean>>(() => {
    // Default all series to true initially
    const initial: Record<string, boolean> = {};
    LLM_SERIES.forEach((s) => {
      initial[s.key] = true;
    });
    return initial;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [input]);

  const currentSession = activeSessionId ? sessions[activeSessionId] : null;
  const messages = (
    currentSession?.type === 'chat' ? (currentSession.data as ChatSessionData).messages : []
  ) as Message[];
  const profile = getModelProfile(chatModelId);
  const allowImageUrl = profile.source === 'custom' || profile.input.imageUrl;
  const allowImageDataUrl = profile.source === 'custom' || profile.input.imageDataUrl;
  const imageDisabledReason =
    profile.source === 'custom'
      ? 'This custom model will be tried with image input.'
      : `${profile.label} is profiled as text-only.`;

  const scrollToBottom = () => {
    // Only scroll if the user is already near the bottom (within 100px)
    // or if it's the user's first message / not streaming
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
    if (selectedImage) {
      const isDataUrl = selectedImage.startsWith('data:image/');
      if ((isDataUrl && !allowImageDataUrl) || (!isDataUrl && !allowImageUrl)) {
        toast.error(imageDisabledReason);
        return;
      }
    }
    if (!apiKey) {
      toast.error('Please set your API Key in settings first');
      document.dispatchEvent(new CustomEvent('open-settings'));
      return;
    }

    let sessionId = activeSessionId;
    if (currentSession?.type !== 'chat') {
      sessionId = createSession('chat');
    }
    if (!sessionId) return;

    const userMessage: Message = selectedImage
      ? {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: selectedImage } },
            { type: 'text', text: input || 'Describe this image' },
          ],
        }
      : { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    updateSessionData(sessionId, { messages: updatedMessages });

    setInput('');
    setSelectedImage(null);
    setForceShowSelector(false);

    // Reasoning Logic
    const currentSeries = LLM_SERIES.find(
      (s) => s.instruct.id === chatModelId || s.thinking?.id === chatModelId
    );
    let finalThinkingIntent: ThinkingIntent = 'auto';
    if (currentSeries) {
      if (currentSeries.thinking?.strategy === 'native_always_on') {
        finalThinkingIntent = 'on';
      } else {
        finalThinkingIntent = (
          currentSeries.isIdSwitch
            ? chatModelId === currentSeries.thinking?.id
            : !!presetThinking[currentSeries.key]
        )
          ? 'on'
          : 'off';
      }
    } else {
      finalThinkingIntent = customThinkingIntent;
    }

    try {
      let assistantContent = '';
      let assistantReasoning = '';
      await start({
        request: (signal) =>
          requestConversationStream(
            {
              messages: updatedMessages,
              model: chatModelId,
              apiKey: apiKey,
              thinkingIntent: finalThinkingIntent,
            },
            signal
          ),
        onDelta: (data) => {
          if (data.r) assistantReasoning += data.r;
          if (data.c) assistantContent += data.c;

          updateSessionData(sessionId, {
            messages: [
              ...updatedMessages,
              {
                role: 'assistant',
                content: assistantContent,
                reasoning: assistantReasoning,
              },
            ],
          });
        },
        onNotice: (notice) => toast.info(notice.message),
        onError: (message) => toast.error(message),
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to API');
    }
  };

  const currentSeries = LLM_SERIES.find(
    (s) => s.instruct.id === chatModelId || s.thinking?.id === chatModelId
  );
  const isCustomModel = !currentSeries;

  const handleSeriesClick = (series: (typeof LLM_SERIES)[0]) => {
    setChatModelId(series.instruct.id);
  };

  const toggleCurrentReasoning = () => {
    if (isCustomModel) {
      const nextIntent =
        customThinkingIntent === 'auto' ? 'on' : customThinkingIntent === 'on' ? 'off' : 'auto';
      setCustomThinkingIntent(nextIntent);
      return;
    }

    const series = currentSeries;
    if (!series?.thinking) return;

    if (series.thinking.strategy === 'native_always_on') {
      toast.info('This model natively outputs reasoning and cannot be turned off.');
      return;
    }

    if (series.isIdSwitch) {
      const isThinking = chatModelId === series.thinking.id;
      setChatModelId(isThinking ? series.instruct.id : series.thinking.id);
    } else {
      setPresetThinking((prev) => ({ ...prev, [series.key]: !prev[series.key] }));
    }
  };

  // Helper for UI thinking status
  const isCurrentlyReasoning = currentSeries
    ? currentSeries.thinking?.strategy === 'native_always_on'
      ? true
      : currentSeries.isIdSwitch
        ? chatModelId === currentSeries.thinking?.id
        : !!presetThinking[currentSeries.key]
    : customThinkingIntent === 'on';
  const thinkingStatusLabel = isCustomModel
    ? customThinkingIntent === 'auto'
      ? 'Thinking Auto'
      : customThinkingIntent === 'on'
        ? 'Try Thinking'
        : 'Try No Thinking'
    : isCurrentlyReasoning
      ? 'Reasoning Active'
      : 'Chat Mode';

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative overflow-hidden h-full">
      {/* Model Selector - Smart Collapsible */}
      <div className="w-full px-4 pt-1 pb-1 z-30 flex-none">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {messages.length === 0 || forceShowSelector ? (
              <motion.div
                key="full-selector"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-muted/30 border border-border/50 rounded-2xl p-1.5 flex items-stretch gap-1 min-h-[56px] overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:overflow-visible"
              >
                <LayoutGroup>
                  {LLM_SERIES.map((series) => {
                    const isSelected = currentSeries?.key === series.key;
                    const seriesProfile = getModelProfile(series.instruct.id);
                    const supportsImage =
                      seriesProfile.input.imageUrl || seriesProfile.input.imageDataUrl;
                    return (
                      <button
                        type="button"
                        key={series.key}
                        onClick={() => handleSeriesClick(series)}
                        className={cn(
                          'flex-none w-[100px] md:w-auto md:flex-1 snap-center rounded-xl text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-1 relative py-1.5',
                          isSelected
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:bg-background/40'
                        )}
                      >
                        <span className="font-semibold z-10 truncate max-w-full px-1">
                          {series.name}
                        </span>
                        {supportsImage ? (
                          <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold font-mono tracking-wider uppercase scale-90">
                            Vision
                          </span>
                        ) : (
                          <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/80 font-mono tracking-wider uppercase scale-90">
                            Text
                          </span>
                        )}
                        {isSelected && (
                          <motion.div
                            layoutId="act-bg"
                            className="absolute inset-0 bg-secondary shadow-sm border border-border/50 rounded-xl -z-10"
                          />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))}
                    className={cn(
                      'flex-none w-[100px] md:w-auto md:flex-1 snap-center rounded-xl text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-1.5 relative py-1.5 text-muted-foreground hover:bg-background/40',
                      isCustomModel && 'text-foreground'
                    )}
                  >
                    <span className="font-semibold z-10">Custom</span>
                    <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/80 font-mono tracking-wider uppercase scale-90 flex items-center gap-0.5">
                      Config <Settings2 className="h-2.5 w-2.5" />
                    </span>
                    {isCustomModel && (
                      <motion.div
                        layoutId="act-bg"
                        className="absolute inset-0 bg-secondary shadow-sm border border-border/50 rounded-xl -z-10"
                      />
                    )}
                  </button>
                </LayoutGroup>
              </motion.div>
            ) : (
              <motion.div
                key="compact-selector"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between px-4 py-2 bg-muted/20 border border-border/30 rounded-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Model:</span>
                  <span className="text-xs font-semibold">
                    {currentSeries?.name || chatModelId.split('/').pop()}
                  </span>
                  <div
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border',
                      isCurrentlyReasoning
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted text-muted-foreground border-transparent'
                    )}
                  >
                    <BrainCircuit className="h-2.5 w-2.5" />
                    {thinkingStatusLabel}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setForceShowSelector(true)}
                  className="h-7 text-[10px] gap-1 hover:bg-background"
                >
                  <LayoutPanelTop className="h-3 w-3" /> Change Model
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 relative min-h-0">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto p-4">
          <div className="space-y-6 min-h-full max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 absolute inset-0">
                <div className="p-4 rounded-full bg-muted/50 border border-border/50">
                  <Bot className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-medium">ModelScope Prism</h2>
                <p className="text-sm">Deep reasoning & conversational AI</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex gap-4', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0 border',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all',
                    msg.role === 'user'
                      ? 'bg-primary/5 border border-primary/10'
                      : 'bg-muted/30 border border-border/30'
                  )}
                >
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
                    <MarkdownRenderer content={msg.content as string} />
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-4 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted border" />
                <div className="bg-muted/20 border rounded-2xl px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      <div className="w-full px-4 pt-2 pb-2 z-30">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <form
            onSubmit={handleSubmit}
            className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-2xl focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/5 transition-all group flex items-end gap-2"
          >
            {/* 图片输入按钮（Compact 气泡弹窗式） */}
            <ReferenceImageInput
              compact
              value={selectedImage || ''}
              onChange={(next) => setSelectedImage(next || null)}
              uploadQuality={0.8}
              allowUrl={allowImageUrl}
              allowUpload={allowImageDataUrl}
              disabledReason={imageDisabledReason}
            />

            {/* 自适应多行 textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) return;
                e.preventDefault();
                handleSubmit();
              }}
              placeholder={selectedImage ? 'Ask about this image...' : 'Message ModelScope...'}
              rows={1}
              className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-1 text-sm leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
            />

            {/* 深度思考药丸 Toggle 开关 (精致紧凑版) */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleCurrentReasoning}
              className={cn(
                'h-9 shrink-0 rounded-xl px-2.5 text-[10px] gap-1 transition-colors duration-200 mb-0.5',
                isCurrentlyReasoning
                  ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              title={thinkingStatusLabel}
            >
              <BrainCircuit className="h-4 w-4" />
              <span className="hidden sm:inline">Think</span>
            </Button>

            {/* 发送/停止动作按钮 */}
            {isLoading ? (
              <Button
                type="button"
                onClick={handleStop}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors duration-200 mb-0.5 flex items-center justify-center"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() && !selectedImage}
                className="h-9 w-9 shrink-0 rounded-xl transition-colors duration-200 mb-0.5 flex items-center justify-center"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
