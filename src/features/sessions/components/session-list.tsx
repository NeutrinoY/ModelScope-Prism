'use client';

import { Clock, Edit3, Eye, Image as ImageIcon, MessageSquare, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

export function SessionList({ onNavigate }: { onNavigate?: () => void }) {
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {WORKSPACE_LABELS[currentWorkspace]} history
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {workspaceSessions.length} session{workspaceSessions.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          onClick={handleCreate}
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-lg"
          title="New session"
          aria-label="New session"
        >
          <Plus className="h-4 w-4" />
        </Button>
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
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  activeId === session.id
                    ? 'bg-accent-soft border border-accent/20 shadow-sm'
                    : 'hover:bg-surface-muted/60 border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border border-border',
                    activeId === session.id
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'bg-surface-muted/40'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  {editingId === session.id ? (
                    <input
                      className="w-full bg-transparent border-none focus:outline-none text-sm font-medium"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      onBlur={submitRename}
                      onKeyDown={(event) => event.key === 'Enter' && submitRename()}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <p className="text-sm font-medium truncate pr-12">{session.title}</p>
                  )}
                  <p className="text-[10px] text-text-muted font-mono mt-0.5 opacity-70 truncate pr-12">
                    {preview || new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="absolute right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex gap-1">
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
                          <Button variant="outline" onClick={(event) => event.stopPropagation()}>
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
