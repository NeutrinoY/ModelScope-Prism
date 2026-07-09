'use client';

import { Eye, Image as ImageIcon, MessageSquare, Settings2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { WorkspaceType } from '@/lib/contracts';
import { openSettingsDialog } from '@/features/settings/hooks/use-settings-dialog';
import { usePrismStore } from '@/lib/storage';
import { cn } from '@/lib/utils';

/** Mobile bottom nav: workspace switching + settings. Touch-first. */
export function MobileNav() {
  const currentWorkspace = usePrismStore((state) => state.settings.currentWorkspace);
  const setCurrentWorkspace = usePrismStore((state) => state.setCurrentWorkspace);

  const tabs: { id: WorkspaceType; icon: typeof MessageSquare; label: string }[] = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'vision', icon: Eye, label: 'Vision' },
    { id: 'image', icon: ImageIcon, label: 'Studio' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="bg-background/80 backdrop-blur-xl border-t border-border px-6 py-2 flex items-center justify-between shadow-panel">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setCurrentWorkspace(tab.id)}
            className="flex flex-col items-center gap-1 p-2 relative group"
            aria-label={tab.label}
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-colors duration-300',
                currentWorkspace === tab.id
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-muted group-hover:text-foreground'
              )}
            >
              <tab.icon className="h-6 w-6" strokeWidth={currentWorkspace === tab.id ? 2 : 1.5} />
            </div>
            <span
              className={cn(
                'text-[10px] font-medium transition-colors',
                currentWorkspace === tab.id ? 'text-accent' : 'text-text-muted'
              )}
            >
              {tab.label}
            </span>
            {currentWorkspace === tab.id && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute -top-px left-0 right-0 h-[2px] bg-accent/50 mx-4 rounded-full"
              />
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={openSettingsDialog}
          className="flex flex-col items-center gap-1 p-2 relative group"
          aria-label="Settings"
        >
          <div className="p-1.5 rounded-lg text-text-muted group-hover:text-foreground transition-colors duration-300">
            <Settings2 className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-medium text-text-muted">Settings</span>
        </button>
      </div>
    </div>
  );
}
