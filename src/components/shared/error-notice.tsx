'use client';

import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, ChevronRight, KeyRound, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { motionDurations, motionEase } from '@/lib/config/motion';
import type { PrismErrorCode } from '@/lib/contracts';
import { userMessageForCode } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WorkspaceError = {
  code: PrismErrorCode;
  message?: string;
  requestId?: string;
};

/**
 * Workspace-level error block: user-readable cause + next step, with an
 * expandable detail row (request id, error code) — docs/rebuild/01 states
 * errors must never collapse into a generic failure.
 * Incorporates subtle spring shake feedback on repeat errors and respects
 * reduced motion settings.
 */
export function ErrorNotice({
  error,
  isRetrying = false,
  onRetry,
  onOpenSettings,
}: {
  error: WorkspaceError | null;
  isRetrying?: boolean;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [activeError, setActiveError] = useState<WorkspaceError | null>(error);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const prevErrorRef = useRef<WorkspaceError | null>(error);

  useEffect(() => {
    if (error) {
      setActiveError(error);
      if (prevErrorRef.current !== error) {
        setShakeTrigger((prev) => prev + 1);
      }
    }
    prevErrorRef.current = error;
  }, [error]);

  const isTokenIssue =
    activeError?.code === 'MISSING_API_KEY' || activeError?.code === 'AUTH_FAILED';
  const message = activeError?.message || (activeError ? userMessageForCode(activeError.code) : '');

  if (!activeError) return null;

  const shakeVariants = {
    shake: shouldReduceMotion
      ? { x: 0 }
      : {
          x: [0, -6, 6, -4, 4, -2, 2, 0],
          transition: {
            duration: 0.35,
            ease: 'easeInOut' as const,
          },
        },
    idle: { x: 0 },
  };

  return (
    <motion.div
      variants={shakeVariants}
      animate={shakeTrigger > 0 ? 'shake' : 'idle'}
      key={shakeTrigger}
      style={{ opacity: isRetrying ? 0.55 : 1 }}
      transition={{ duration: motionDurations.base, ease: motionEase.standard }}
      className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm transition-opacity duration-300"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-foreground leading-relaxed">{message}</p>
          <div className="flex items-center gap-2">
            {isTokenIssue && onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={isRetrying}
                onClick={onOpenSettings}
              >
                <KeyRound className="h-3 w-3" />
                Open Settings
              </Button>
            )}
            {!isTokenIssue && onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={isRetrying}
                onClick={onRetry}
              >
                <RefreshCw className={cn('h-3 w-3', isRetrying && 'animate-spin')} />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </div>
          <details className="group">
            <summary className="text-[10px] text-text-muted cursor-pointer list-none flex items-center gap-1 hover:text-text-secondary transition-colors">
              <ChevronRight className="h-2.5 w-2.5 transition-transform group-open:rotate-90" />
              Details
            </summary>
            <div className="mt-1.5 text-[10px] font-mono text-text-muted space-y-0.5">
              <p>code: {activeError.code}</p>
              {activeError.requestId && <p>request id: {activeError.requestId}</p>}
            </div>
          </details>
        </div>
      </div>
    </motion.div>
  );
}
