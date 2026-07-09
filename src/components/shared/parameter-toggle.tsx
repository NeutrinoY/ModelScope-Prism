'use client';

import { cn } from '@/lib/utils';

/**
 * Explicit-send parameter row: a checkbox that visibly gates whether the
 * value is sent. Unchecked = not sent, even when a value is displayed
 * (docs/rebuild/09 parameter control semantics).
 */
export function ParameterToggle({
  label,
  enabled,
  onToggle,
  children,
  hint,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 transition-colors',
        enabled ? 'border-accent/40 bg-accent-soft' : 'border-border bg-transparent'
      )}
    >
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-border-strong accent-[hsl(var(--accent))] cursor-pointer"
        />
        <span
          className={cn(
            'text-xs font-medium flex-1',
            enabled ? 'text-foreground' : 'text-text-muted'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded',
            enabled ? 'bg-accent/15 text-accent' : 'bg-surface-muted text-text-muted'
          )}
        >
          {enabled ? 'Sent' : 'Not sent'}
        </span>
      </label>
      {children && (
        <div
          className={cn('mt-2 transition-opacity', !enabled && 'opacity-40 pointer-events-none')}
        >
          {children}
        </div>
      )}
      {hint && <p className="mt-1.5 text-[10px] text-text-muted">{hint}</p>}
    </div>
  );
}
