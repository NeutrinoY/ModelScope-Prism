'use client';

import { AlertTriangle, ChevronRight, KeyRound, RefreshCw } from 'lucide-react';
import type { PrismErrorCode } from '@/lib/contracts';
import { userMessageForCode } from '@/lib/domain';
import { Button } from '@/components/ui/button';

export type WorkspaceError = {
  code: PrismErrorCode;
  message?: string;
  requestId?: string;
};

/**
 * Workspace-level error block: user-readable cause + next step, with an
 * expandable detail row (request id, error code) — docs/rebuild/01 states
 * errors must never collapse into a generic failure.
 */
export function ErrorNotice({
  error,
  onRetry,
  onOpenSettings,
}: {
  error: WorkspaceError;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}) {
  const isTokenIssue = error.code === 'MISSING_API_KEY' || error.code === 'AUTH_FAILED';
  const message = error.message || userMessageForCode(error.code);

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
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
                onClick={onOpenSettings}
              >
                <KeyRound className="h-3 w-3" />
                Open Settings
              </Button>
            )}
            {!isTokenIssue && onRetry && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onRetry}>
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
          <details className="group">
            <summary className="text-[10px] text-text-muted cursor-pointer list-none flex items-center gap-1 hover:text-text-secondary transition-colors">
              <ChevronRight className="h-2.5 w-2.5 transition-transform group-open:rotate-90" />
              Details
            </summary>
            <div className="mt-1.5 text-[10px] font-mono text-text-muted space-y-0.5">
              <p>code: {error.code}</p>
              {error.requestId && <p>request id: {error.requestId}</p>}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
