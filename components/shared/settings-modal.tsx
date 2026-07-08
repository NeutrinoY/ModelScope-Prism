'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { BrainCircuit } from 'lucide-react';
import { getModelProfile, type ThinkingIntent } from '@/lib/model-capabilities';

export function SettingsModal() {
  const [open, setOpen] = useState(false);

  const {
    apiKey,
    setApiKey,
    chatModelId,
    setChatModelId,
    visionModelId,
    setVisionModelId,
    imageModelId,
    setImageModelId,
    customThinkingIntent,
    setCustomThinkingIntent,
  } = useAppStore();

  const [localApiKey, setLocalApiKey] = useState('');
  const [localChatId, setLocalChatId] = useState('');
  const [localVisionId, setLocalVisionId] = useState('');
  const [localImageId, setLocalImageId] = useState('');
  const [localThinkingIntent, setLocalThinkingIntent] = useState<ThinkingIntent>('auto');

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    document.addEventListener('open-settings', handleOpen);
    return () => document.removeEventListener('open-settings', handleOpen);
  }, []);

  useEffect(() => {
    if (open) {
      setLocalApiKey(apiKey);
      setLocalChatId(chatModelId);
      setLocalVisionId(visionModelId);
      setLocalImageId(imageModelId);
      setLocalThinkingIntent(customThinkingIntent);
    }
  }, [open, apiKey, chatModelId, visionModelId, imageModelId, customThinkingIntent]);

  const handleSave = () => {
    setApiKey(localApiKey);
    setChatModelId(localChatId);
    setVisionModelId(localVisionId);
    setImageModelId(localImageId);
    setCustomThinkingIntent(localThinkingIntent);

    setOpen(false);
    toast.success('Settings saved');
  };

  const localChatProfile = getModelProfile(localChatId);
  const localVisionProfile = getModelProfile(localVisionId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] overflow-y-auto max-h-[85vh] p-4 md:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>Configure your API access and default models.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">ModelScope Access Token</Label>
            <Input
              id="api-key"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              type="password"
              placeholder="sk-..."
            />
            <div className="text-[10px] text-muted-foreground">
              Get token from{' '}
              <a
                href="https://modelscope.cn/my/myaccesstoken"
                target="_blank"
                rel="noopener"
                className="underline hover:text-primary"
              >
                ModelScope
              </a>
            </div>
          </div>

          <div className="border-t border-border/50 my-1" />

          {/* Chat Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="chat-model">Chat Model ID</Label>
            </div>
            <Input
              id="chat-model"
              value={localChatId}
              onChange={(e) => setLocalChatId(e.target.value)}
              placeholder="e.g. deepseek-ai/DeepSeek-V4-Flash"
            />
            <p className="text-[10px] text-muted-foreground">
              {localChatProfile.source === 'custom'
                ? 'Unknown profile: Prism sends conservative defaults until this model is added as a built-in profile.'
                : 'Built-in profile: request parameters are fixed from the local capability map.'}
            </p>

            {/* Custom Model Thinking Intent */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BrainCircuit className="h-3.5 w-3.5" />
                Custom model thinking
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/50 bg-muted/30 p-1">
                {[
                  { value: 'auto', label: 'Auto' },
                  { value: 'on', label: 'Try On' },
                  { value: 'off', label: 'Try Off' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLocalThinkingIntent(item.value as ThinkingIntent)}
                    className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                      localThinkingIntent === item.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Auto sends no thinking parameter for custom models. Try On/Off attempts a control
                and retries with the model default if rejected.
              </p>
            </div>
          </div>

          {/* Vision Settings */}
          <div className="space-y-2">
            <Label htmlFor="vision-model">Vision Model ID</Label>
            <Input
              id="vision-model"
              value={localVisionId}
              onChange={(e) => setLocalVisionId(e.target.value)}
              placeholder="e.g. Qwen/Qwen3-VL-235B-A22B-Instruct"
            />
            <p className="text-[10px] text-muted-foreground">
              {localVisionProfile.source === 'custom'
                ? 'Unknown profile: image URL and upload inputs are allowed as a direct trial.'
                : localVisionProfile.input.imageUrl || localVisionProfile.input.imageDataUrl
                  ? 'Built-in profile: image inputs are enabled for this model.'
                  : 'Built-in profile: this model is text-only, so image inputs are disabled.'}
            </p>
          </div>

          {/* Image Settings */}
          <div className="space-y-2">
            <Label htmlFor="image-model">Image Gen Model ID</Label>
            <Input
              id="image-model"
              value={localImageId}
              onChange={(e) => setLocalImageId(e.target.value)}
              placeholder="e.g. Qwen/Qwen-Image"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
