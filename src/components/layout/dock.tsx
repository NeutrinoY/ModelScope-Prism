'use client';

import { Eye, Image as ImageIcon, MessageSquare, Settings } from 'lucide-react';
import { motion, type MotionValue, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { ComponentType } from 'react';
import { useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WorkspaceType } from '@/lib/contracts';
import { openSettingsDialog } from '@/features/settings/hooks/use-settings-dialog';
import { usePrismStore } from '@/lib/storage';
import { cn } from '@/lib/utils';

/** Desktop dock: workspace switching + settings (magnifying hover). */
export function Dock() {
  const mouseX = useMotionValue(Infinity);
  const currentWorkspace = usePrismStore((state) => state.settings.currentWorkspace);
  const setCurrentWorkspace = usePrismStore((state) => state.setCurrentWorkspace);

  const items: { id: WorkspaceType; icon: ComponentType<{ className?: string }>; label: string }[] =
    [
      { id: 'chat', icon: MessageSquare, label: 'Chat (LLM)' },
      { id: 'vision', icon: Eye, label: 'Vision (VLM)' },
      { id: 'image', icon: ImageIcon, label: 'Studio (AIGC)' },
    ];

  return (
    <TooltipProvider>
      <motion.div
        onMouseMove={(event) => mouseX.set(event.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex h-16 items-end gap-4 rounded-panel border border-border bg-surface-elevated/60 backdrop-blur-md px-4 pb-3 shadow-panel pointer-events-auto"
      >
        {items.map((item) => (
          <DockIcon
            key={item.id}
            mouseX={mouseX}
            icon={item.icon}
            label={item.label}
            isActive={currentWorkspace === item.id}
            onClick={() => setCurrentWorkspace(item.id)}
          />
        ))}

        <div className="h-10 w-px bg-border my-auto" />

        <DockIcon
          mouseX={mouseX}
          icon={Settings}
          label="Settings"
          isActive={false}
          onClick={openSettingsDialog}
        />
      </motion.div>
    </TooltipProvider>
  );
}

function DockIcon({
  mouseX,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  mouseX: MotionValue<number>;
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const distance = useTransform(mouseX, (value) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          ref={ref}
          style={{ width }}
          onClick={onClick}
          aria-label={label}
          className={cn(
            'aspect-square w-10 cursor-pointer rounded-full flex items-center justify-center transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-muted/60 hover:bg-surface-muted text-text-muted hover:text-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </motion.button>
      </TooltipTrigger>
      <TooltipContent sideOffset={10}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
