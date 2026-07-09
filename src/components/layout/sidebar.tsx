'use client';

import { Menu, PanelLeft } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SessionList } from '@/features/sessions/components/session-list';

/** History sidebar: a left sheet hosting the workspace-scoped session list. */
export function Sidebar({ customTrigger }: { customTrigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {customTrigger || (
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-surface-elevated/50 backdrop-blur-md border border-border shadow-panel hover:bg-surface-elevated/90"
            title="History"
            aria-label="Open history"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="left"
        hideClose
        className="w-[300px] p-0 bg-surface-elevated/90 backdrop-blur-2xl border-r border-border flex flex-col gap-0"
      >
        <SheetTitle className="sr-only">History</SheetTitle>
        <SheetDescription className="sr-only">
          Session history for the current workspace.
        </SheetDescription>
        <div className="absolute right-3 top-3.5 z-10">
          <SheetClose asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg"
              title="Close"
              aria-label="Close history"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <SessionList onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
