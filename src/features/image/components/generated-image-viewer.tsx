'use client';

import { ChevronLeft, ChevronRight, Copy, Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { GeneratedImage } from '@/lib/contracts';

/**
 * Near-fullscreen generated-image viewer with keyboard navigation,
 * prompt copy, and download (docs/rebuild/01 mobile image viewer).
 */
export function GeneratedImageViewer({
  image,
  gallery,
  onNavigate,
  onClose,
}: {
  image: GeneratedImage | null;
  gallery: GeneratedImage[];
  onNavigate: (image: GeneratedImage) => void;
  onClose: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [displayedImage, setDisplayedImage] = useState<GeneratedImage | null>(image);
  const activeImage = image ?? displayedImage;
  const currentIndex = activeImage ? gallery.findIndex((item) => item.id === activeImage.id) : -1;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < gallery.length - 1;

  const navigate = useCallback(
    (direction: number) => {
      if (currentIndex === -1) return;
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < gallery.length) {
        onNavigate(gallery[nextIndex]);
      }
    },
    [currentIndex, gallery, onNavigate]
  );

  useEffect(() => {
    if (image) setDisplayedImage(image);
  }, [image]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!image) return;
      if (event.key === 'ArrowLeft') navigate(-1);
      if (event.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, navigate]);

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Prompt copied');
  };

  const downloadImage = async (target: GeneratedImage) => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(target.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${target.modelId.split('/').pop() || 'image'}-${target.id}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success('Download started');
    } catch {
      window.open(target.url, '_blank', 'noopener,noreferrer');
      toast.error('Direct download was blocked. Opened the image instead.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideClose
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;
          if (!image) setDisplayedImage(null);
        }}
        className="prism-image-viewer max-w-[95vw] h-[95vh] p-0 border-none bg-transparent shadow-none flex flex-col items-center justify-center"
      >
        <DialogTitle className="sr-only">Image view</DialogTitle>
        <div
          className="relative w-full h-full flex flex-col items-center justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {activeImage && (
            <>
              <div className="relative flex items-center justify-center w-full h-full px-12">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 h-12 w-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md text-white border border-white/10"
                  disabled={!canGoPrevious}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(-1);
                  }}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImage.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    src={activeImage.url}
                    alt={activeImage.prompt}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-image"
                  />
                </AnimatePresence>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 h-12 w-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md text-white border border-white/10"
                  disabled={!canGoNext}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(1);
                  }}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              <div
                className="mt-4 bg-surface-elevated/85 backdrop-blur-xl border border-border rounded-panel p-4 max-w-3xl w-full flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 shadow-popover z-50"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <p className="text-sm font-medium line-clamp-2" title={activeImage.prompt}>
                    {activeImage.prompt}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted font-mono">
                    <span>{activeImage.modelId.split('/').pop()}</span>
                    {activeImage.size && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-text-muted/50 hidden md:block" />
                        <span className="bg-surface-muted px-1.5 py-0.5 rounded text-[10px]">
                          {activeImage.size}
                        </span>
                      </>
                    )}
                    {activeImage.requestMeta?.seed !== undefined && (
                      <span className="bg-surface-muted px-1.5 py-0.5 rounded text-[10px]">
                        seed {activeImage.requestMeta.seed}
                      </span>
                    )}
                    <span className="w-1 h-1 rounded-full bg-text-muted/50 hidden md:block" />
                    <span>{new Date(activeImage.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 justify-end border-t border-border/20 pt-2 md:border-none md:pt-0">
                  <Button
                    onClick={() => copyPrompt(activeImage.prompt)}
                    variant="secondary"
                    size="icon"
                    className="rounded-lg h-8 w-8 md:h-9 md:w-9"
                    title="Copy prompt"
                    aria-label="Copy prompt"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => downloadImage(activeImage)}
                    variant="secondary"
                    size="icon"
                    className="rounded-lg h-8 w-8 md:h-9 md:w-9"
                    disabled={isDownloading}
                    title="Download"
                    aria-label="Download image"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon"
                    className="rounded-lg h-8 w-8 md:h-9 md:w-9 hover:bg-danger/10 hover:text-danger"
                    title="Close"
                    aria-label="Close viewer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
