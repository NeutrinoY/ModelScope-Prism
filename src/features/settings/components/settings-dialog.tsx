'use client';

import { BrainCircuit, KeyRound, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTransferSection } from '@/features/settings/components/data-transfer-section';
import { useSettingsDialog } from '@/features/settings/hooks/use-settings-dialog';
import type { ThinkingMode } from '@/lib/contracts';
import { getModelProfile } from '@/lib/domain';
import { usePrismStore } from '@/lib/storage';
import { cn } from '@/lib/utils';

/**
 * Global settings (docs/rebuild/01): token, default model IDs, default
 * conversation thinking, theme, and import/export. Defaults only affect
 * new sessions — existing sessions keep their own settings.
 */
export function SettingsDialog() {
  const open = useSettingsDialog((state) => state.open);
  const setOpen = useSettingsDialog((state) => state.setOpen);

  const apiKey = usePrismStore((state) => state.secrets.apiKey ?? '');
  const settings = usePrismStore((state) => state.settings);
  const setApiKey = usePrismStore((state) => state.setApiKey);
  const updateSettings = usePrismStore((state) => state.updateSettings);

  const { resolvedTheme, setTheme } = useTheme();

  const [localApiKey, setLocalApiKey] = useState('');
  const [localChatId, setLocalChatId] = useState('');
  const [localVisionId, setLocalVisionId] = useState('');
  const [localImageId, setLocalImageId] = useState('');
  const [localThinkingMode, setLocalThinkingMode] = useState<ThinkingMode>('auto');

  useEffect(() => {
    if (!open) return;
    setLocalApiKey(apiKey);
    setLocalChatId(settings.modelDefaults.chatModelId);
    setLocalVisionId(settings.modelDefaults.visionModelId);
    setLocalImageId(settings.modelDefaults.imageModelId);
    setLocalThinkingMode(settings.conversationDefaults.thinking.mode);
  }, [open, apiKey, settings]);

  const handleSave = () => {
    setApiKey(localApiKey);
    updateSettings({
      modelDefaults: {
        chatModelId: localChatId.trim(),
        visionModelId: localVisionId.trim(),
        imageModelId: localImageId.trim(),
      },
      conversationDefaults: {
        ...settings.conversationDefaults,
        thinking:
          localThinkingMode === 'auto'
            ? { mode: 'auto' }
            : { mode: localThinkingMode, format: 'enable_thinking' },
      },
    });
    setOpen(false);
    toast.success('Settings saved');
  };

  const chatProfile = getModelProfile(localChatId.trim());
  const visionProfile = getModelProfile(localVisionId.trim());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] overflow-y-auto max-h-[85vh] p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Token, default models, and local data. Defaults apply to new sessions only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Access token */}
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              ModelScope Access Token
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                value={localApiKey}
                onChange={(event) => setLocalApiKey(event.target.value)}
                type="password"
                placeholder="ms-…"
                className="flex-1"
              />
              {localApiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs shrink-0"
                  onClick={() => setLocalApiKey('')}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-[10px] text-text-muted">
              Stored only in this browser. Get a token from{' '}
              <a
                href="https://modelscope.cn/my/myaccesstoken"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent"
              >
                ModelScope
              </a>
              .
            </p>
          </div>

          <div className="border-t border-border/60" />

          {/* Default model IDs */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="chat-model">Default Chat model ID</Label>
              <Input
                id="chat-model"
                value={localChatId}
                onChange={(event) => setLocalChatId(event.target.value)}
                placeholder="e.g. deepseek-ai/DeepSeek-V4-Flash"
              />
              <p className="text-[10px] text-text-muted">
                {chatProfile.source === 'custom'
                  ? 'Custom model: basic calls only, no parameters are sent unless you enable them.'
                  : 'Built-in profile: known capabilities inform UI hints.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vision-model">Default Vision model ID</Label>
              <Input
                id="vision-model"
                value={localVisionId}
                onChange={(event) => setLocalVisionId(event.target.value)}
                placeholder="e.g. Qwen/Qwen3.5-397B-A17B"
              />
              <p className="text-[10px] text-text-muted">
                {visionProfile.source === 'custom'
                  ? 'Custom model: image input is allowed as a direct trial.'
                  : visionProfile.input.imageUrl === true
                    ? 'Built-in profile: image input is known to work.'
                    : 'Built-in profile: this model is profiled as text-only.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-model">Default AIGC model ID</Label>
              <Input
                id="image-model"
                value={localImageId}
                onChange={(event) => setLocalImageId(event.target.value)}
                placeholder="e.g. Qwen/Qwen-Image"
              />
            </div>
          </div>

          <div className="border-t border-border/60" />

          {/* Default thinking for new sessions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BrainCircuit className="h-3.5 w-3.5" />
              Default thinking (new sessions)
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-muted/40 p-1 relative">
              {(
                [
                  { value: 'auto', label: 'Auto' },
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setLocalThinkingMode(item.value)}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-xs transition-colors relative z-10',
                    localThinkingMode === item.value
                      ? 'text-foreground'
                      : 'text-text-muted hover:text-foreground'
                  )}
                >
                  <span className="relative z-10">{item.label}</span>
                  {localThinkingMode === item.value && (
                    <motion.div
                      layoutId="settings-thinking-bg"
                      className="absolute inset-0 bg-background shadow-sm border border-border rounded-md"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-muted">
              Auto sends no thinking parameter. On/Off sends one explicit format per request.
            </p>
          </div>

          <div className="border-t border-border/60" />

          {/* Theme */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Theme</p>
            <div className="flex gap-2">
              <Button
                variant={resolvedTheme === 'light' ? 'secondary' : 'outline'}
                size="sm"
                className="flex-1 gap-2 text-xs"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </Button>
              <Button
                variant={resolvedTheme === 'dark' ? 'secondary' : 'outline'}
                size="sm"
                className="flex-1 gap-2 text-xs"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </Button>
            </div>
          </div>

          <div className="border-t border-border/60" />

          <DataTransferSection />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
