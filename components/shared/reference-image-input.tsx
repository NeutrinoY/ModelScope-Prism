'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, UploadCloud, X, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { compressImage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ReferenceImageInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  uploadQuality?: number;
  maxSizeMb?: number;
  compact?: boolean;
  allowUrl?: boolean;
  allowUpload?: boolean;
  disabledReason?: string;
};

function isValidImageSource(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return (
    /^https?:\/\/\S+$/i.test(v) ||
    /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(v)
  );
}

export function ReferenceImageInput({
  value,
  onChange,
  label = 'Reference Image',
  placeholder = 'Paste image URL...',
  uploadQuality = 0.8,
  maxSizeMb = 10,
  compact = false,
  allowUrl = true,
  allowUpload = true,
  disabledReason = 'Image input is not available for this model.',
}: ReferenceImageInputProps) {
  const [urlDraft, setUrlDraft] = useState('');
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [open, setOpen] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!compact || !open) return;
    const onClickOutside = (evt: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(evt.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [compact, open]);

  const applyImageUrl = () => {
    const next = urlDraft.trim();
    if (!next) {
      toast.error('Please enter an image URL');
      return;
    }
    const isDataUrl = next.startsWith('data:image/');
    if ((isDataUrl && !allowUpload) || (!isDataUrl && !allowUrl)) {
      toast.error(disabledReason);
      return;
    }
    if (!isValidImageSource(next)) {
      toast.error('URL must be http(s) or data:image base64');
      return;
    }
    onChange(next);
    setImagePreviewError(false);
    toast.success('Reference image set');
    if (compact) setOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!allowUpload) {
      toast.error(disabledReason);
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`Image size must be less than ${maxSizeMb}MB`);
      e.target.value = '';
      return;
    }

    try {
      const base64 = await compressImage(file, uploadQuality);
      onChange(base64);
      setUrlDraft('');
      setImagePreviewError(false);
      if (compact) setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to process image');
    } finally {
      e.target.value = '';
    }
  };

  const clearImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange('');
    setUrlDraft('');
    setImagePreviewError(false);
  };

  const canSelectImage = allowUrl || allowUpload;

  const panel = (
    <div
      className={cn(
        'bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 w-full'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
            onClick={clearImage}
          >
            Remove Image
          </Button>
        )}
      </div>

      {!canSelectImage && !value ? (
        <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-5 text-center text-xs text-muted-foreground">
          {disabledReason}
        </div>
      ) : value ? (
        <div className="relative rounded-xl overflow-hidden bg-muted/30 border border-border/50 aspect-video flex items-center justify-center">
          {!imagePreviewError ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-contain"
              onError={() => setImagePreviewError(true)}
            />
          ) : (
            <div className="text-xs text-muted-foreground flex flex-col items-center gap-2">
              <X className="h-6 w-6 opacity-50" />
              <span>Invalid Image Source</span>
            </div>
          )}
        </div>
      ) : (
        allowUpload && (
          <button
            type="button"
            className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/30 hover:border-primary/50 hover:text-primary transition-all cursor-pointer group"
            onClick={() => imageFileInputRef.current?.click()}
          >
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium mt-1">Click to upload image</p>
            <p className="text-[10px] opacity-70">JPG, PNG, WEBP up to {maxSizeMb}MB</p>
          </button>
        )
      )}

      {!value && allowUrl && (
        <>
          {allowUpload && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">
                OR
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  applyImageUrl();
                }}
                placeholder={placeholder}
                className="h-9 text-xs bg-muted/30 border-border/50 focus-visible:ring-1 pl-8"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 text-xs shrink-0 px-4"
              onClick={applyImageUrl}
            >
              Apply
            </Button>
          </div>
        </>
      )}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );

  if (!compact) {
    return panel;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={!canSelectImage}
        className={cn(
          'relative h-9 w-9 shrink-0 rounded-xl overflow-hidden transition-all border mb-0.5',
          value
            ? 'border-primary/40 shadow-sm'
            : 'border-transparent hover:bg-primary/10 hover:text-primary text-muted-foreground',
          'grid place-items-center group bg-background',
          canSelectImage ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'
        )}
        title={canSelectImage ? 'Reference image' : disabledReason}
      >
        {value && !imagePreviewError ? (
          <>
            <img src={value} alt="thumb" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImagePlus className="h-4 w-4 text-white" />
            </div>
          </>
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
      </button>

      {value && (
        <button
          type="button"
          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive border border-background text-destructive-foreground hover:scale-110 transition-transform grid place-items-center shadow-sm z-10"
          onClick={clearImage}
          title="Clear reference image"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full mb-4 left-0 md:-left-2 z-50 origin-bottom-left w-[calc(100vw-32px)] max-w-[340px]"
          >
            {panel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
