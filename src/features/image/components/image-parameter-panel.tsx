'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ParameterToggle } from '@/components/shared/parameter-toggle';
import { LoraEditor } from '@/features/image/components/lora-editor';
import type { ImageSessionSettings, LoraRequest } from '@/lib/contracts';
import { IMAGE_PARAM_RANGES } from '@/lib/contracts';
import { IMAGE_SIZE_PRESETS } from '@/lib/config/limits';
import { cn } from '@/lib/utils';

/**
 * AIGC parameter panel (docs/rebuild/03): basic (negative_prompt, size)
 * and advanced (seed, steps, guidance, loras). Every optional parameter
 * is explicitly enabled per item — an open advanced section sends nothing
 * by itself, and displayed values are not request values.
 */
export function ImageParameterPanel({
  settings,
  onChange,
}: {
  settings: ImageSessionSettings;
  onChange: (update: Partial<ImageSessionSettings>) => void;
}) {
  const isCustomSize = !IMAGE_SIZE_PRESETS.includes(
    settings.size.value as (typeof IMAGE_SIZE_PRESETS)[number]
  );

  return (
    <div className="space-y-5">
      {/* Basic: negative prompt */}
      <div className="space-y-2">
        <Label htmlFor="neg-prompt" className="text-xs font-medium">
          Negative prompt
        </Label>
        <Textarea
          id="neg-prompt"
          value={settings.negativePrompt}
          onChange={(event) => onChange({ negativePrompt: event.target.value })}
          placeholder="low quality, blurry…"
          maxLength={IMAGE_PARAM_RANGES.negativePromptMaxLength}
          className="h-20 resize-none text-xs"
        />
        <p className="text-[10px] text-text-muted">Sent only when not empty.</p>
      </div>

      {/* Basic: size */}
      <ParameterToggle
        label="Size"
        enabled={settings.size.enabled}
        onToggle={(enabled) => onChange({ size: { ...settings.size, enabled } })}
        hint="Resolution ranges differ per model family; the upstream reports unsupported sizes."
      >
        <div className="space-y-2">
          <select
            className="flex h-8 w-full rounded-md border border-border bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={isCustomSize ? 'custom' : settings.size.value}
            onChange={(event) => {
              if (event.target.value !== 'custom') {
                onChange({ size: { ...settings.size, value: event.target.value } });
              }
            }}
            aria-label="Size preset"
          >
            {IMAGE_SIZE_PRESETS.map((preset) => (
              <option key={preset} value={preset} className="bg-background">
                {preset}
              </option>
            ))}
            <option value="custom" className="bg-background">
              Custom…
            </option>
          </select>
          <Input
            value={settings.size.value}
            onChange={(event) =>
              onChange({ size: { ...settings.size, value: event.target.value } })
            }
            placeholder="WIDTHxHEIGHT"
            className={cn('h-8 text-xs font-mono', !isCustomSize && 'hidden')}
            aria-label="Custom size"
          />
        </div>
      </ParameterToggle>

      {/* Advanced */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface-elevated px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Advanced — enable per item
          </span>
        </div>
      </div>

      <ParameterToggle
        label={`Steps (${settings.steps.value})`}
        enabled={settings.steps.enabled}
        onToggle={(enabled) => onChange({ steps: { ...settings.steps, enabled } })}
      >
        <Input
          type="range"
          min={IMAGE_PARAM_RANGES.steps.min}
          max={IMAGE_PARAM_RANGES.steps.max}
          value={settings.steps.value}
          onChange={(event) =>
            onChange({ steps: { ...settings.steps, value: Number(event.target.value) } })
          }
          className="h-2 bg-transparent p-0 accent-[hsl(var(--accent))] border-none shadow-none"
          aria-label="Steps"
        />
      </ParameterToggle>

      <ParameterToggle
        label={`Guidance (${settings.guidance.value})`}
        enabled={settings.guidance.enabled}
        onToggle={(enabled) => onChange({ guidance: { ...settings.guidance, enabled } })}
      >
        <Input
          type="range"
          min={IMAGE_PARAM_RANGES.guidance.min}
          max={IMAGE_PARAM_RANGES.guidance.max}
          step={0.5}
          value={settings.guidance.value}
          onChange={(event) =>
            onChange({ guidance: { ...settings.guidance, value: Number(event.target.value) } })
          }
          className="h-2 bg-transparent p-0 accent-[hsl(var(--accent))] border-none shadow-none"
          aria-label="Guidance"
        />
      </ParameterToggle>

      <ParameterToggle
        label="Seed"
        enabled={settings.seed.enabled}
        onToggle={(enabled) => onChange({ seed: { ...settings.seed, enabled } })}
      >
        <Input
          type="number"
          min={IMAGE_PARAM_RANGES.seed.min}
          max={IMAGE_PARAM_RANGES.seed.max}
          value={settings.seed.value}
          onChange={(event) =>
            onChange({
              seed: {
                ...settings.seed,
                value: Math.max(0, Math.trunc(Number(event.target.value) || 0)),
              },
            })
          }
          placeholder="Seed"
          className="h-8 text-xs font-mono"
          aria-label="Seed"
        />
      </ParameterToggle>

      <div className="pt-2 border-t border-border/60">
        <LoraEditor value={settings.loras} onChange={(loras: LoraRequest) => onChange({ loras })} />
        <p className="text-[10px] text-text-muted mt-2">
          Sent only when at least one LoRA has a repo ID. Base-model compatibility is up to you.
        </p>
      </div>
    </div>
  );
}
