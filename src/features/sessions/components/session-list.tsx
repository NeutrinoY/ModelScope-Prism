'use client';

import {
  Check,
  Clock,
  Edit3,
  Eye,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { motionDurations, motionEase } from '@/lib/config/motion';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Session, WorkspaceType } from '@/lib/contracts';
import { filterSessionsByType, sessionPreview } from '@/lib/domain';
import { usePrismStore } from '@/lib/storage';
import { cn } from '@/lib/utils';

/**
 * History list for the current workspace. Chat / Vision / AIGC histories
 * are separate (docs/rebuild/01): the list only shows the active
 * workspace's sessions.
 */

const WORKSPACE_ICONS = {
  chat: MessageSquare,
  vision: Eye,
  image: ImageIcon,
} as const;

const WORKSPACE_LABELS: Record<WorkspaceType, string> = {
  chat: 'Chat',
  vision: 'Vision',
  image: 'AIGC',
};

export function SessionList({
  onNavigate,
  headerAction,
}: {
  onNavigate?: () => void;
  headerAction?: React.ReactNode;
}) {
  const currentWorkspace = usePrismStore((state) => state.settings.currentWorkspace);
  const sessions = usePrismStore((state) => state.sessions);
  const activeSessionByWorkspace = usePrismStore((state) => state.activeSessionByWorkspace);
  const createSession = usePrismStore((state) => state.createSession);
  const deleteSession = usePrismStore((state) => state.deleteSession);
  const renameSession = usePrismStore((state) => state.renameSession);
  const setActiveSession = usePrismStore((state) => state.setActiveSession);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

  const workspaceSessions = filterSessionsByType(sessions, currentWorkspace);
  const activeId = activeSessionByWorkspace[currentWorkspace];
  const Icon = WORKSPACE_ICONS[currentWorkspace];

  const handleCreate = () => {
    createSession(currentWorkspace);
    toast.success(`New ${WORKSPACE_LABELS[currentWorkspace]} session`);
    onNavigate?.();
  };

  const handleSelect = (session: Session) => {
    setActiveSession(currentWorkspace, session.id);
    onNavigate?.();
  };

  const startRename = (event: React.MouseEvent, session: Session) => {
    event.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const submitRename = () => {
    if (editingId && editTitle.trim()) {
      renameSession(editingId, editTitle);
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/40 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {WORKSPACE_LABELS[currentWorkspace]} history
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {workspaceSessions.length} session{workspaceSessions.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={handleCreate}
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-text-muted hover:text-foreground"
            title="New session"
            aria-label="New session"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {headerAction}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {workspaceSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-30">
            <Clock className="h-8 w-8 mb-2" />
            <p className="text-xs font-medium">No history yet</p>
          </div>
        ) : (
          workspaceSessions.map((session) => {
            const preview = sessionPreview(session);
            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(session)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  handleSelect(session);
                }}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]',
                  editingId === session.id
                    ? 'bg-surface-muted/70 border border-accent/40 shadow-focus'
                    : activeId === session.id
                      ? 'bg-accent-soft border border-accent/20 shadow-sm'
                      : 'hover:bg-surface-muted/60 border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border border-border transition-colors duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]',
                    activeId === session.id
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'bg-surface-muted/40'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden h-[38px] flex items-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {editingId === session.id ? (
                      <motion.div
                        key="editing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: motionDurations.fast, ease: motionEase.standard }}
                        className="w-full flex items-center"
                      >
                        <input
                          className="w-full bg-transparent border-none p-0 pr-12 text-sm font-medium focus:ring-0 focus:outline-none placeholder:text-text-muted/40"
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== 'Escape') return;
                            event.preventDefault();
                            event.stopPropagation();
                            if (event.key === 'Enter') submitRename();
                            if (event.key === 'Escape') cancelRename();
                          }}
                          onClick={(event) => event.stopPropagation()}
                          // biome-ignore lint/a11y/noAutofocus: autofocus is necessary to focus rename input upon clicking rename button
                          autoFocus
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="viewing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: motionDurations.fast, ease: motionEase.standard }}
                        className="w-full"
                      >
                        <p className="text-sm font-medium truncate pr-12">{session.title}</p>
                        <p className="text-[10px] text-text-muted font-mono mt-0.5 opacity-70 truncate pr-12">
                          {preview || new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div
                  className={cn(
                    'absolute right-2 flex gap-1 transition-all duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]',
                    editingId === session.id
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0'
                  )}
                >
                  {editingId === session.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md text-text-muted hover:text-success hover:bg-success/8 transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          submitRename();
                        }}
                        title="Save"
                        aria-label="Save session name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md text-text-muted hover:bg-danger/8 hover:text-danger transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          cancelRename();
                        }}
                        title="Cancel"
                        aria-label="Cancel rename"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-background/80"
                        onClick={(event) => startRename(event, session)}
                        title="Rename"
                        aria-label="Rename session"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:text-danger hover:bg-danger/10"
                            onClick={(event) => event.stopPropagation()}
                            title="Delete"
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent onClick={(event) => event.stopPropagation()}>
                          <DialogHeader>
                            <DialogTitle>Delete session?</DialogTitle>
                            <DialogDescription>
                              This permanently deletes “{session.title}”. This cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button
                                variant="outline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Cancel
                              </Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button
                                variant="destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteSession(session.id);
                                  toast.info('Session deleted');
                                }}
                              >
                                Delete
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border/40 px-4 py-3.5 flex items-center justify-between gap-3 bg-surface-muted/10">
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] font-semibold tracking-wide text-text-secondary">
            ModelScope Prism
          </p>
          <p className="text-[9px] uppercase tracking-[0.15em] text-text-muted/70">
            Local-first Workspace
          </p>
        </div>
        <span className="rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[9px] font-mono text-text-muted">
          2.0
        </span>
      </div>
    </div>
  );
}
