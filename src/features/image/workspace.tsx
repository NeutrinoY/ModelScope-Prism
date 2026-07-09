'use client';

import { RefreshCw, Sliders, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErrorNotice } from '@/components/shared/error-notice';
import { ImageInputDialog } from '@/components/shared/image-input-dialog';
import { GeneratedImageGrid } from '@/features/image/components/generated-image-grid';
import { GeneratedImageViewer } from '@/features/image/components/generated-image-viewer';
import { ImageParameterPanel } from '@/features/image/components/image-parameter-panel';
import { useImageTask } from '@/features/image/hooks/use-image-task';
import { openSettingsDialog } from '@/features/settings/hooks/use-settings-dialog';
import type {
  GeneratedImage,
  ImageGenerationRequest,
  ImageInputValue,
  ImageSession,
  ImageSessionSettings,
} from '@/lib/contracts';
import { IMAGE_PARAM_RANGES } from '@/lib/contracts';
import { IMAGE_INPUT_LIMITS } from '@/lib/config/limits';
import {
  deriveSessionTitle,
  isDefaultTitle,
  isValidSizeFormat,
  validateLoraRequest,
} from '@/lib/domain';
import { selectActiveSession, usePrismStore } from '@/lib/storage';
import { cn } from '@/lib/utils';

/**
 * AIGC workspace (docs/rebuild/03): prompt composer + explicit parameter
 * panel + local gallery + async task lifecycle. The minimal request is
 * model + prompt; everything else is opt-in per item.
 */
export function ImageWorkspace() {
  const session = usePrismStore((state) =>
    selectActiveSession(state, 'image')
  ) as ImageSession | null;
  const modelDefaults = usePrismStore((state) => state.settings.modelDefaults);
  const imageDefaults = usePrismStore((state) => state.settings.imageDefaults);

  const task = useImageTask();

  const [prompt, setPrompt] = useState('');
  const [imageInputs, setImageInputs] = useState<ImageInputValue[]>([]);
  const [showDesktopPanel, setShowDesktopPanel] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<GeneratedImage | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [prompt]);

  const modelId = session?.modelId ?? modelDefaults.imageModelId;
  const settings = session?.settings ?? imageDefaults;
  const gallery = session?.images ?? [];

  const updateSettings = (update: Partial<ImageSessionSettings>) => {
    const store = usePrismStore.getState();
    const active = selectActiveSession(store, 'image');
    if (active) {
      store.updateImageSessionSettings(active.id, update);
    } else {
      store.updateSettings({
        imageDefaults: { ...store.settings.imageDefaults, ...update },
      });
    }
  };

  const resetOptionalParams = () => {
    updateSettings({
      size: { ...settings.size, enabled: false },
      negativePrompt: '',
      seed: { ...settings.seed, enabled: false },
      steps: { ...settings.steps, enabled: false },
      guidance: { ...settings.guidance, enabled: false },
      loras: { items: [] },
    });
    toast.info('Optional parameters reset — only model and prompt will be sent.');
  };

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || task.isGenerating) return;
    if (trimmedPrompt.length > IMAGE_PARAM_RANGES.promptMaxLength) {
      toast.error(`Prompt must be under ${IMAGE_PARAM_RANGES.promptMaxLength} characters.`);
      return;
    }
    if (settings.size.enabled && !isValidSizeFormat(settings.size.value)) {
      toast.error('Size must be WIDTHxHEIGHT within [64, 2048].');
      return;
    }
    const activeLoraItems = settings.loras.items.filter((item) => item.modelId.trim());
    if (activeLoraItems.length > 0) {
      const check = validateLoraRequest({ items: activeLoraItems });
      if (!check.ok) {
        toast.error(
          check.reason === 'weight_sum'
            ? 'LoRA weights must sum to 1.0.'
            : 'LoRA entries are invalid.'
        );
        return;
      }
    }

    const store = usePrismStore.getState();
    let active = selectActiveSession(store, 'image') as ImageSession | null;
    if (!active) {
      const id = store.createSession('image', modelId);
      active = usePrismStore.getState().sessions[id] as ImageSession;
    }
    if (isDefaultTitle(active.title)) {
      store.renameSession(active.id, deriveSessionTitle(trimmedPrompt));
    }

    // Explicit-send: build the request only from enabled/provided values.
    const request: ImageGenerationRequest = {
      model: active.modelId,
      prompt: trimmedPrompt,
      ...(settings.negativePrompt.trim() ? { negativePrompt: settings.negativePrompt.trim() } : {}),
      ...(settings.size.enabled ? { size: settings.size } : {}),
      ...(imageInputs.length > 0 ? { imageInput: imageInputs } : {}),
      advanced: {
        ...(settings.seed.enabled ? { seed: settings.seed } : {}),
        ...(settings.steps.enabled ? { steps: settings.steps } : {}),
        ...(settings.guidance.enabled ? { guidance: settings.guidance } : {}),
        ...(activeLoraItems.length > 0 ? { loras: { items: activeLoraItems } } : {}),
      },
    };

    const ok = await task.submit(request, active.id);
    if (ok) {
      setPrompt('');
    }
  };

  const parameterPanel = (
    <div className="space-y-4">
      <ImageParameterPanel settings={settings} onChange={updateSettings} />
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs gap-1.5"
        onClick={resetOptionalParams}
      >
        <X className="h-3 w-3" />
        Reset — send prompt only
      </Button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
      {/* Left: gallery + composer */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0 pb-4 pt-4 px-4">
          {gallery.length === 0 && !task.isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="p-4 rounded-full bg-surface-muted/60 border border-border">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-medium">Studio</h2>
                <p className="text-sm mt-1 max-w-xs">
                  Describe an image and generate with {modelId.split('/').pop()}. Add an input image
                  to edit instead.
                </p>
              </div>
            </div>
          ) : (
            <GeneratedImageGrid
              images={gallery}
              isGenerating={task.isGenerating}
              onView={setViewingImage}
            />
          )}
        </div>

        {task.error && (
          <div className="px-4 pb-2 max-w-3xl mx-auto w-full">
            <ErrorNotice
              error={task.error}
              onOpenSettings={openSettingsDialog}
              onRetry={task.clearError}
            />
          </div>
        )}

        {/* Composer */}
        <div className="w-full pt-2 pb-2 z-30 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-surface-elevated/80 backdrop-blur-xl border border-border rounded-panel p-1.5 shadow-panel focus-within:border-accent/45 focus-within:shadow-focus transition-[border-color,box-shadow] flex items-end gap-2">
              <ImageInputDialog
                values={imageInputs}
                onChange={setImageInputs}
                maxImages={IMAGE_INPUT_LIMITS.imageEditMaxImages}
                label="Input images"
                hint="Sent as image_url for image editing / img2img. Public URLs are the most reliable for editing models."
              />

              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  imageInputs.length > 0
                    ? 'Describe how to edit the image…'
                    : 'A cyberpunk city in the rain, neon lights…'
                }
                rows={1}
                className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-1 text-sm leading-relaxed overflow-y-auto"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg text-text-muted md:hidden mb-0.5"
                onClick={() => setIsMobilePanelOpen(true)}
                title="Parameters"
                aria-label="Open parameters"
              >
                <Sliders className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 shrink-0 rounded-lg text-text-muted hidden md:grid place-items-center mb-0.5',
                  showDesktopPanel && 'bg-surface-muted text-foreground'
                )}
                onClick={() => setShowDesktopPanel((prev) => !prev)}
                title="Parameters"
                aria-label="Toggle parameter panel"
              >
                <Sliders className="h-4 w-4" />
              </Button>

              <Button
                onClick={handleSubmit}
                size="icon"
                disabled={task.isGenerating || !prompt.trim()}
                className="h-9 w-9 shrink-0 rounded-lg mb-0.5"
                title="Generate"
                aria-label="Generate image"
              >
                {task.isGenerating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop parameter panel */}
      <AnimatePresence>
        {showDesktopPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:block border-l border-border bg-surface/50 backdrop-blur-xl overflow-y-auto overflow-x-hidden"
          >
            <div className="p-5 w-[320px] pb-12 bg-surface-elevated/0">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-sm tracking-wide uppercase text-text-muted">
                  Parameters
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowDesktopPanel(false)}
                  aria-label="Close parameter panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {parameterPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile parameter sheet */}
      <Sheet open={isMobilePanelOpen} onOpenChange={setIsMobilePanelOpen}>
        <SheetContent
          side="bottom"
          className="h-[80vh] overflow-y-auto rounded-t-[1.5rem] pt-6 px-5"
        >
          <SheetHeader className="mb-5">
            <SheetTitle>Parameters</SheetTitle>
          </SheetHeader>
          {parameterPanel}
        </SheetContent>
      </Sheet>

      <GeneratedImageViewer
        image={viewingImage}
        gallery={gallery}
        onNavigate={setViewingImage}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
}
