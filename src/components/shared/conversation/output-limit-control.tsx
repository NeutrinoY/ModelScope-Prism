'use client';

import type { OutputLimitRequest } from '@/lib/contracts';
import { OUTPUT_LIMIT_TIERS } from '@/lib/config/limits';
import { getModelProfile, resolveOutputLimitParam } from '@/lib/domain';
import { ParameterToggle } from '@/components/shared/parameter-toggle';
import { cn } from '@/lib/utils';

/**
 * Output limit control (docs/rebuild/04): disabled by default — nothing is
 * sent. When enabled, one of two fixed tiers is sent via the profiled
 * param (max_tokens / max_completion_tokens). No free-form numbers.
 */
export function OutputLimitControl({
  modelId,
  value,
  onChange,
}: {
  modelId: string;
  value: OutputLimitRequest;
  onChange: (value: OutputLimitRequest) => void;
}) {
  const profile = getModelProfile(modelId);
  const param = resolveOutputLimitParam(profile);

  if (!param) {
    return (
      <p className="text-[11px] text-text-muted leading-relaxed">
        This model has no known output limit parameter. Nothing is sent.
      </p>
    );
  }

  return (
    <ParameterToggle
      label="Output limit"
      enabled={value.enabled}
      onToggle={(enabled) => onChange({ ...value, enabled, param })}
      hint={`Sends ${param} when enabled.`}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {(['standard', 'high'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ ...value, mode, param })}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-[11px] transition-colors border text-center',
              value.mode === mode
                ? 'border-accent/40 bg-accent-soft text-foreground font-medium'
                : 'border-border text-text-muted hover:bg-surface-muted'
            )}
          >
            <span className="capitalize">{mode}</span>
            <span className="block text-[9px] font-mono opacity-70">
              {(mode === 'high'
                ? OUTPUT_LIMIT_TIERS.high
                : OUTPUT_LIMIT_TIERS.standard
              ).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </ParameterToggle>
  );
}
