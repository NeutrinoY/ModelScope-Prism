'use client';

import { Loader2, Maximize2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { GeneratedImage } from '@/lib/contracts';
import { imageEntrance } from '@/lib/config/motion';

/**
 * Generated image gallery: CSS columns masonry (docs/rebuild/10 replaced
 * react-masonry-css). Single column on mobile, up to three on desktop.
 */
export function GeneratedImageGrid({
  images,
  isGenerating,
  onView,
}: {
  images: GeneratedImage[];
  isGenerating: boolean;
  onView: (image: GeneratedImage) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-2">
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 pb-24 [column-fill:balance]">
        {isGenerating && (
          <div className="mb-5 break-inside-avoid">
            <motion.div
              initial={imageEntrance.initial}
              animate={imageEntrance.animate}
              transition={imageEntrance.transition}
              className="aspect-square rounded-panel bg-surface-muted/50 border border-border flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-shimmer"
                style={{ backgroundSize: '200% 100%' }}
              />
              <Loader2 className="h-8 w-8 animate-spin text-text-muted mb-4" />
              <p className="text-xs font-mono uppercase tracking-widest text-text-muted">
                Dreaming…
              </p>
            </motion.div>
          </div>
        )}

        {images.map((image) => (
          <motion.div
            key={image.id}
            initial={imageEntrance.initial}
            animate={imageEntrance.animate}
            transition={imageEntrance.transition}
            onClick={() => onView(image)}
            className="group relative rounded-panel overflow-hidden bg-surface-muted border border-border shadow-sm cursor-zoom-in mb-5 break-inside-avoid"
          >
            <img
              src={image.url}
              alt={image.prompt}
              className="w-full h-auto block transition-transform duration-[520ms] ease-[var(--motion-ease-standard)] group-hover:scale-[1.035]"
              loading="lazy"
            />

            <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-[420ms] ease-[var(--motion-ease-standard)]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/22 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <p className="text-white text-xs line-clamp-2 mb-3 font-medium">{image.prompt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/70 font-mono bg-black/20 border border-white/12 px-2 py-0.5 rounded-full">
                    {image.modelId.split('/').pop()}
                  </span>
                  <Maximize2 className="h-4 w-4 text-white/70" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
