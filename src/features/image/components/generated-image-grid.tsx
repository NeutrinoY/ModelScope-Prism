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
              className="w-full h-auto block transition-transform duration-[450ms] ease-[var(--motion-ease-standard)] group-hover:scale-[1.03]"
              loading="lazy"
            />

            <div className="absolute inset-0 flex flex-col justify-end p-4 z-10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[450ms] ease-[var(--motion-ease-standard)]" />
              <p className="relative text-white text-xs line-clamp-2 mb-3 font-medium opacity-0 group-hover:opacity-100 translate-y-[2px] group-hover:translate-y-0 transition-all duration-[450ms] ease-[var(--motion-ease-standard)]">
                {image.prompt}
              </p>
              <div className="relative flex items-center justify-between">
                <span className="text-[10px] text-white/70 font-mono bg-white/10 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 translate-y-[2px] group-hover:translate-y-0 transition-all duration-[450ms] ease-[var(--motion-ease-standard)]">
                  {image.modelId.split('/').pop()}
                </span>
                <Maximize2 className="h-4 w-4 text-white/70 opacity-0 group-hover:opacity-100 translate-y-[2px] group-hover:translate-y-0 transition-all duration-[450ms] ease-[var(--motion-ease-standard)]" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
