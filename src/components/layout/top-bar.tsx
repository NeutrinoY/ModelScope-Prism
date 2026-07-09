'use client';

import { KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { openSettingsDialog } from '@/features/settings/hooks/use-settings-dialog';
import { selectActiveSession, usePrismStore } from '@/lib/storage';
import { cn } from '@/lib/utils';

/**
 * Desktop top bar: the current workspace's model ID plus token status.
 * Editing the model updates the active session's own modelId; with no
 * active session it updates the workspace default for new sessions.
 */
export function TopBar() {
  const currentWorkspace = usePrismStore((state) => state.settings.currentWorkspace);
  const modelDefaults = usePrismStore((state) => state.settings.modelDefaults);
  const activeSession = usePrismStore((state) => selectActiveSession(state, currentWorkspace));
  const setSessionModelId = usePrismStore((state) => state.setSessionModelId);
  const updateSettings = usePrismStore((state) => state.updateSettings);
  const hasApiKey = usePrismStore((state) => Boolean(state.secrets.apiKey));

  const labels = {
    chat: 'LLM Model ID',
    vision: 'VLM Model ID',
    image: 'AIGC Model ID',
  } as const;

  const defaultKey = {
    chat: 'chatModelId',
    vision: 'visionModelId',
    image: 'imageModelId',
  } as const;

  const modelId = activeSession?.modelId ?? modelDefaults[defaultKey[currentWorkspace]];

  const handleChange = (value: string) => {
    if (activeSession) {
      setSessionModelId(activeSession.id, value);
    } else {
      updateSettings({
        modelDefaults: { ...modelDefaults, [defaultKey[currentWorkspace]]: value },
      });
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 flex items-start justify-center z-40 bg-gradient-to-b from-background to-transparent pointer-events-none pt-4">
      <div className="pointer-events-auto bg-surface-elevated/60 backdrop-blur-md border border-border rounded-full px-4 md:px-6 py-2 shadow-panel flex items-center gap-2 md:gap-4 transition-colors hover:bg-surface-elevated/90 h-10">
        <Label className="hidden md:block text-xs text-text-muted font-mono uppercase tracking-wider whitespace-nowrap">
          {labels[currentWorkspace]}
        </Label>
        <div className="hidden md:block h-4 w-px bg-border" />
        <Input
          className="h-6 w-[200px] md:w-[280px] border-none bg-transparent focus-visible:ring-0 px-0 text-sm font-medium shadow-none"
          value={modelId}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Enter model ID…"
          aria-label={labels[currentWorkspace]}
        />
        <div className="h-4 w-px bg-border" />
        <button
          type="button"
          onClick={openSettingsDialog}
          title={hasApiKey ? 'Token set — open Settings' : 'No token — open Settings'}
          aria-label={hasApiKey ? 'Token set' : 'Token missing'}
          className={cn(
            'flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors',
            hasApiKey ? 'text-success hover:text-success/80' : 'text-warning hover:text-warning/80'
          )}
        >
          <KeyRound className="h-3 w-3" />
          <span className="hidden lg:inline">{hasApiKey ? 'Token' : 'No token'}</span>
        </button>
      </div>
    </div>
  );
}
