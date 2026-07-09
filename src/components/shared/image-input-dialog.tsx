'use client';

import { ImagePlus, Link as LinkIcon, UploadCloud, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ImageInputValue } from '@/lib/contracts';
import { popEntrance } from '@/lib/config/motion';
import { IMAGE_INPUT_LIMITS } from '@/lib/config/limits';
import { toImageInputValue } from '@/lib/domain';
import { cn, compressImageToDataUrl } from '@/lib/utils';

/**
 * Shared image input (docs/rebuild/08): compact trigger + floating panel
 * near the composer. Supports public URLs, local upload -> data URL, and
 * multiple images. Copy varies per workspace via props; the value contract
 * stays uniform.
 */

type ImageInputDialogProps = {
  values: ImageInputValue[];
  onChange: (values: ImageInputValue[]) => void;
  maxImages?: number;
  label?: string;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  disabledReason?: string;
  allowRemoteUrl?: boolean;
  allowDataUrl?: boolean;
};

export function ImageInputDialog({
  values,
  onChange,
  maxImages = IMAGE_INPUT_LIMITS.conversationMaxImages,
  label = 'Images',
  placeholder = 'Paste image URL…',
  hint,
  disabled = false,
  disabledReason = 'Image input is not available for this model.',
  allowRemoteUrl = true,
  allowDataUrl = true,
}: ImageInputDialogProps) {
  const [open, setOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const atCapacity = values.length >= maxImages;
  const canAddAnySource = allowRemoteUrl || allowDataUrl;
  const triggerDisabled = disabled || !canAddAnySource;

  const addFromUrl = () => {
    if (!canAddAnySource) {
      toast.error(disabledReason);
      return;
    }
    const raw = urlDraft.trim();
    if (!raw) {
      toast.error('Enter an image URL first.');
      return;
    }
    const value = toImageInputValue(raw);
    if (!value) {
      toast.error('URL must be http(s) or a data:image base64 URL.');
      return;
    }
    if (value.source === 'remote_url' && !allowRemoteUrl) {
      toast.error('Remote image URLs are not available for this model.');
      return;
    }
    if (value.source === 'data_url' && !allowDataUrl) {
      toast.error('Base64 image data is not available for this model.');
      return;
    }
    if (atCapacity) {
      toast.error(`Up to ${maxImages} images.`);
      return;
    }
    onChange([...values, value]);
    setUrlDraft('');
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!allowDataUrl) {
      toast.error('Local image upload is not available for this model.');
      return;
    }
    if (files.length === 0) return;

    const room = maxImages - values.length;
    if (room <= 0) {
      toast.error(`Up to ${maxImages} images.`);
      return;
    }

    const next: ImageInputValue[] = [];
    for (const file of files.slice(0, room)) {
      if (file.size > IMAGE_INPUT_LIMITS.maxUploadSizeMb * 1024 * 1024) {
        toast.error(`Images must be under ${IMAGE_INPUT_LIMITS.maxUploadSizeMb}MB.`);
        continue;
      }
      try {
        const dataUrl = await compressImageToDataUrl(file, IMAGE_INPUT_LIMITS.uploadQuality);
        const value = toImageInputValue(dataUrl);
        if (value) next.push(value);
      } catch {
        toast.error('Failed to process an image.');
      }
    }
    if (next.length > 0) {
      onChange([...values, ...next]);
    }
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={triggerDisabled}
        aria-label={triggerDisabled ? disabledReason : label}
        title={triggerDisabled ? disabledReason : label}
        className={cn(
          'relative h-9 w-9 shrink-0 rounded-lg overflow-hidden transition-colors border mb-0.5 grid place-items-center group bg-background',
          values.length > 0
            ? 'border-accent/40 shadow-sm'
            : 'border-transparent hover:bg-accent-soft hover:text-accent text-text-muted',
          triggerDisabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
        )}
      >
        {values.length > 0 ? (
          <>
            <img src={values[0].url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImagePlus className="h-4 w-4 text-white" />
            </div>
            {values.length > 1 && (
              <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-mono px-1 rounded-tl">
                {values.length}
              </span>
            )}
          </>
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
      </button>

      {values.length > 0 && (
        <button
          type="button"
          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-danger border border-background text-white hover:scale-110 transition-transform grid place-items-center shadow-sm z-10"
          onClick={(event) => {
            event.stopPropagation();
            onChange([]);
          }}
          aria-label="Clear all images"
          title="Clear all images"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={popEntrance.initial}
            animate={popEntrance.animate}
            exit={popEntrance.exit}
            transition={popEntrance.transition}
            className="absolute bottom-full mb-4 left-0 md:-left-2 z-50 origin-bottom-left w-[calc(100vw-32px)] max-w-[340px]"
          >
            <div className="bg-surface-elevated/95 backdrop-blur-xl border border-border rounded-panel p-4 shadow-popover flex flex-col gap-3.5 w-full">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{label}</div>
                <span className="text-[10px] font-mono text-text-muted">
                  {values.length}/{maxImages}
                </span>
              </div>

              {hint && <p className="text-[10px] text-text-muted leading-relaxed">{hint}</p>}

              {values.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {values.map((value, index) => (
                    <div
                      key={`${value.url.slice(0, 48)}-${index}`}
                      className="relative rounded-lg overflow-hidden border border-border bg-surface-muted aspect-square group/thumb"
                    >
                      <img src={value.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAt(index)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] font-mono text-center py-0.5">
                        {value.source === 'data_url' ? 'upload' : 'url'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!atCapacity && (
                <>
                  {allowDataUrl && (
                    <button
                      type="button"
                      className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 text-text-muted hover:bg-surface-muted/60 hover:border-accent/50 hover:text-accent transition-colors cursor-pointer group/upload"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="h-5 w-5" />
                      <p className="text-xs font-medium">Click to upload</p>
                      <p className="text-[10px] opacity-70">
                        JPG, PNG, WEBP up to {IMAGE_INPUT_LIMITS.maxUploadSizeMb}MB
                      </p>
                    </button>
                  )}

                  {allowRemoteUrl && allowDataUrl && (
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[9px] text-text-muted font-medium uppercase tracking-widest">
                        or
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {allowRemoteUrl && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                        <Input
                          value={urlDraft}
                          onChange={(event) => setUrlDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            addFromUrl();
                          }}
                          placeholder={placeholder}
                          className="h-9 text-xs bg-surface-muted/60 border-border pl-8"
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 text-xs shrink-0 px-4"
                        onClick={addFromUrl}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
