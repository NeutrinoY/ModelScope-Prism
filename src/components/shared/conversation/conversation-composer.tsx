'use client';

import { Send, SlidersHorizontal, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ImageInputDialog } from '@/components/shared/image-input-dialog';
import { OutputLimitControl } from '@/components/shared/conversation/output-limit-control';
import { ThinkingControl } from '@/components/shared/conversation/thinking-control';
import type {
  ConversationSessionSettings,
  ImageInputValue,
  OutputLimitRequest,
  ThinkingRequestControl,
} from '@/lib/contracts';
import { popEntrance } from '@/lib/config/motion';
import { allowsImageInput, getModelProfile } from '@/lib/domain';
import { cn } from '@/lib/utils';

/**
 * Shared bottom composer for Chat and Vision — the primary interaction
 * center (docs/rebuild/08). Hosts image input, the autosizing textarea,
 * thinking control, advanced settings, and send/stop.
 */

export type ComposerSubmitPayload = {
  text: string;
  images: ImageInputValue[];
};

export function ConversationComposer({
  modelId,
  settings,
  onSettingsChange,
  isStreaming,
  onSubmit,
  onStop,
  placeholder = 'Send a message…',
  imagePlaceholder = 'Ask about the image…',
  imageLabel = 'Attach images',
  imageHint,
  maxImages,
  autoFocusImages = false,
}: {
  modelId: string;
  settings: ConversationSessionSettings;
  onSettingsChange: (settings: Partial<ConversationSessionSettings>) => void;
  isStreaming: boolean;
  onSubmit: (payload: ComposerSubmitPayload) => void;
  onStop: () => void;
  placeholder?: string;
  imagePlaceholder?: string;
  imageLabel?: string;
  imageHint?: string;
  maxImages?: number;
  autoFocusImages?: boolean;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<ImageInputValue[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);
  const imageInput = allowsImageInput(getModelProfile(modelId));
  const imageInputDisabled = !imageInput.remoteUrl && !imageInput.dataUrl;
  const hasUnsupportedImages = images.some((image) =>
    image.source === 'remote_url' ? !imageInput.remoteUrl : !imageInput.dataUrl
  );
  const resolvedImageHint = hasUnsupportedImages
    ? 'Remove images that are not supported by the current model before sending.'
    : imageHint;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [text]);

  useEffect(() => {
    if (!advancedOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!advancedRef.current) return;
      if (!advancedRef.current.contains(event.target as Node)) setAdvancedOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [advancedOpen]);

  const canSubmit =
    (text.trim().length > 0 || images.length > 0) && !isStreaming && !hasUnsupportedImages;

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!canSubmit) return;
    onSubmit({ text: text.trim(), images });
    setText('');
    setImages([]);
  };

  return (
    <div className="w-full px-4 pt-2 pb-2 z-30">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative bg-surface-elevated/80 backdrop-blur-xl border border-border rounded-panel p-1.5 shadow-panel focus-within:border-accent/45 focus-within:shadow-focus transition-[border-color,box-shadow] flex items-end gap-2"
        >
          <ImageInputDialog
            values={images}
            onChange={setImages}
            label={imageLabel}
            placeholder="Paste image URL…"
            hint={resolvedImageHint}
            disabled={imageInputDisabled}
            disabledReason="Image input is not available for this model."
            allowRemoteUrl={imageInput.remoteUrl}
            allowDataUrl={imageInput.dataUrl}
            {...(maxImages !== undefined ? { maxImages } : {})}
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.shiftKey) return;
              event.preventDefault();
              handleSubmit();
            }}
            placeholder={images.length > 0 || autoFocusImages ? imagePlaceholder : placeholder}
            rows={1}
            className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-1 text-sm leading-relaxed overflow-y-auto"
          />

          <ThinkingControl
            modelId={modelId}
            value={settings.thinking}
            onChange={(thinking: ThinkingRequestControl) => onSettingsChange({ thinking })}
          />

          <div ref={advancedRef} className="relative">
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              title="Advanced settings"
              aria-label="Advanced settings"
              className={cn(
                'h-9 w-9 shrink-0 rounded-lg mb-0.5 grid place-items-center transition-colors',
                settings.outputLimit.enabled || advancedOpen
                  ? 'bg-surface-muted text-foreground'
                  : 'text-text-muted hover:bg-surface-muted'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {advancedOpen && (
                <motion.div
                  initial={popEntrance.initial}
                  animate={popEntrance.animate}
                  exit={popEntrance.exit}
                  transition={popEntrance.transition}
                  className="absolute bottom-full mb-4 right-0 z-50 origin-bottom-right w-[280px]"
                >
                  <div className="bg-surface-elevated/95 backdrop-blur-xl border border-border rounded-panel p-4 shadow-popover space-y-3">
                    <p className="text-sm font-semibold">Advanced</p>
                    <OutputLimitControl
                      modelId={modelId}
                      value={settings.outputLimit}
                      onChange={(outputLimit: OutputLimitRequest) =>
                        onSettingsChange({ outputLimit })
                      }
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
              className="h-9 w-9 shrink-0 rounded-lg bg-danger/10 text-danger hover:bg-danger/15 transition-colors mb-0.5 grid place-items-center"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="Send"
              title="Send"
              className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors mb-0.5 grid place-items-center"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
