'use client';

import { BrainCircuit } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ThinkingFormat, ThinkingMode, ThinkingRequestControl } from '@/lib/contracts';
import { popEntrance } from '@/lib/config/motion';
import { getModelProfile, resolveVisibleThinkingFormat } from '@/lib/domain';
import { cn } from '@/lib/utils';

/**
 * Thinking control (docs/rebuild/04): a three-state selector.
 * Auto = no thinking parameter is sent — never an auto-injected default.
 * On/Off sends exactly one selected format. For custom models the format
 * is visible and switchable; built-in models pin their profiled format.
 */

const MODE_ITEMS: { value: ThinkingMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto', hint: 'No thinking parameter is sent. Model default applies.' },
  { value: 'on', label: 'On', hint: 'Sends the enable parameter in the selected format.' },
  { value: 'off', label: 'Off', hint: 'Sends the disable parameter in the selected format.' },
];

const FORMAT_ITEMS: { value: ThinkingFormat; label: string }[] = [
  { value: 'enable_thinking', label: 'enable_thinking' },
  { value: 'chat_template_kwargs.enable_thinking', label: 'chat_template_kwargs' },
  { value: 'thinking.type', label: 'thinking.type' },
];

export function ThinkingControl({
  modelId,
  value,
  onChange,
}: {
  modelId: string;
  value: ThinkingRequestControl;
  onChange: (value: ThinkingRequestControl) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const profile = getModelProfile(modelId);
  const isCustom = profile.source === 'custom';
  const profiledFormat = resolveVisibleThinkingFormat(profile);
  const isNativeAlwaysOn = profile.thinking.format === 'native_always_on';
  const isUncontrollable = profile.source === 'builtin' && profiledFormat === null;

  const activeFormat: ThinkingFormat = value.format ?? profiledFormat ?? 'enable_thinking';

  const statusLabel =
    value.mode === 'auto' ? 'Think: Auto' : value.mode === 'on' ? 'Think: On' : 'Think: Off';

  const setMode = (mode: ThinkingMode) => {
    if (mode === 'auto') {
      onChange({ mode: 'auto' });
    } else {
      onChange({ mode, format: activeFormat });
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={statusLabel}
        aria-label={statusLabel}
        className={cn(
          'h-9 shrink-0 rounded-lg px-2.5 text-[10px] gap-1 transition-colors duration-200 mb-0.5 inline-flex items-center font-medium',
          value.mode === 'on'
            ? 'bg-accent-soft text-accent border border-accent/25 hover:bg-accent/15'
            : value.mode === 'off'
              ? 'bg-surface-muted text-text-secondary border border-border hover:bg-surface-muted/70'
              : 'text-text-muted hover:bg-surface-muted border border-transparent'
        )}
      >
        <BrainCircuit className="h-4 w-4" />
        <span className="hidden sm:inline">
          {value.mode === 'auto' ? 'Think' : value.mode === 'on' ? 'Think On' : 'Think Off'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={popEntrance.initial}
            animate={popEntrance.animate}
            exit={popEntrance.exit}
            transition={popEntrance.transition}
            className="absolute bottom-full mb-4 right-0 z-50 origin-bottom-right w-[280px]"
          >
            <div className="bg-surface-elevated/95 backdrop-blur-xl border border-border rounded-panel p-4 shadow-popover space-y-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BrainCircuit className="h-4 w-4 text-accent" />
                Thinking
              </div>

              {isNativeAlwaysOn ? (
                <p className="text-[11px] text-text-muted leading-relaxed">
                  This model natively outputs reasoning; no control parameter applies.
                </p>
              ) : isUncontrollable ? (
                <p className="text-[11px] text-text-muted leading-relaxed">
                  This model has no known thinking control. No parameter is sent.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-muted/50 p-1 relative">
                    {MODE_ITEMS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setMode(item.value)}
                        className={cn(
                          'rounded-md px-2 py-1.5 text-xs transition-colors relative z-10',
                          value.mode === item.value
                            ? 'text-foreground'
                            : 'text-text-muted hover:text-foreground'
                        )}
                      >
                        <span className="relative z-10">{item.label}</span>
                        {value.mode === item.value && (
                          <motion.div
                            layoutId="thinking-mode-bg"
                            className="absolute inset-0 bg-background shadow-sm border border-border rounded-md"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-text-muted leading-relaxed">
                    {MODE_ITEMS.find((item) => item.value === value.mode)?.hint}
                  </p>

                  {value.mode !== 'auto' && (
                    <div className="space-y-1.5 pt-1 border-t border-border/60">
                      <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                        Format {!isCustom && '(profiled)'}
                      </p>
                      {isCustom ? (
                        <div className="space-y-1">
                          {FORMAT_ITEMS.map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => onChange({ mode: value.mode, format: item.value })}
                              className={cn(
                                'w-full text-left rounded-md px-2.5 py-1.5 text-[11px] font-mono transition-colors border',
                                activeFormat === item.value
                                  ? 'border-accent/40 bg-accent-soft text-foreground'
                                  : 'border-transparent text-text-muted hover:bg-surface-muted'
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] font-mono text-text-secondary bg-surface-muted rounded-md px-2.5 py-1.5">
                          {activeFormat}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
