'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';
import { usePrismStore } from '@/lib/storage';

const TITLES = {
  chat: 'Chat',
  vision: 'Vision',
  image: 'Studio',
} as const;

/** Mobile header: history entry + current workspace title. */
export function MobileHeader() {
  const currentWorkspace = usePrismStore((state) => state.settings.currentWorkspace);

  return (
    <div className="fixed top-0 left-0 right-0 h-14 z-40 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:hidden">
      <Sidebar
        customTrigger={
          <Button variant="ghost" size="icon" className="-ml-2" aria-label="Open history">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <span className="font-medium text-sm tracking-wide">{TITLES[currentWorkspace]}</span>
      <div className="w-9" />
    </div>
  );
}
