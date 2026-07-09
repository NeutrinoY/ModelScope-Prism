'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Dock } from '@/components/layout/dock';
import { MobileHeader } from '@/components/layout/mobile-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { ChatWorkspace } from '@/features/chat/workspace';
import { ImageWorkspace } from '@/features/image/workspace';
import { SettingsDialog } from '@/features/settings/components/settings-dialog';
import { VisionWorkspace } from '@/features/vision/workspace';
import { workspaceTransition } from '@/lib/config/motion';
import { usePrismStore } from '@/lib/storage';

/**
 * The application shell (docs/rebuild/08): first screen is a usable
 * workspace. Desktop gets sidebar/top-bar/dock; mobile gets header,
 * bottom nav and sheets. Workspace switches restore the last active
 * session of that workspace (state lives in the store).
 */
export function AppShell() {
  const currentWorkspace = usePrismStore((state) => state.settings.currentWorkspace);
  const hasHydrated = usePrismStore((state) => state.hasHydrated);

  return (
    <main className="h-[100dvh] w-full bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background noise texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <MobileHeader />

      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="hidden md:block">
        <TopBar />
      </div>

      <div className="flex-1 flex flex-col relative z-10 pt-16 pb-24 md:pt-16 md:pb-36 px-0 md:px-4 max-w-5xl mx-auto w-full overflow-hidden">
        {hasHydrated ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWorkspace}
              initial={workspaceTransition.initial}
              animate={workspaceTransition.animate}
              exit={workspaceTransition.exit}
              transition={workspaceTransition.transition}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {currentWorkspace === 'chat' && <ChatWorkspace />}
              {currentWorkspace === 'vision' && <VisionWorkspace />}
              {currentWorkspace === 'image' && <ImageWorkspace />}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-border border-t-accent animate-spin" />
          </div>
        )}
      </div>

      <div className="fixed bottom-10 left-0 right-0 z-40 hidden md:flex justify-center pointer-events-none">
        <Dock />
      </div>

      <div className="fixed bottom-2 left-0 right-0 z-30 hidden md:flex justify-center pointer-events-none">
        <p className="text-[9px] text-text-muted/25 uppercase tracking-[0.2em] font-bold">
          Powered by ModelScope API-Inference
        </p>
      </div>

      <MobileNav />
      <SettingsDialog />
    </main>
  );
}
