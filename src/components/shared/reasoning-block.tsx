'use client';

import { BrainCircuit, ChevronRight } from 'lucide-react';

/**
 * Collapsible reasoning display. Open while streaming, collapsed after.
 * Reasoning display is a UI behavior — it never changes the request.
 */
export function ReasoningBlock({
  reasoning,
  isStreaming = false,
}: {
  reasoning: string;
  isStreaming?: boolean;
}) {
  if (!reasoning) return null;

  return (
    <div className="mb-3 border-l-2 border-accent/25 pl-3 py-1">
      <details className="group" open={isStreaming}>
        <summary className="text-[11px] font-medium text-text-muted cursor-pointer list-none flex items-center gap-1.5 hover:text-accent transition-colors">
          <BrainCircuit className="h-3 w-3" />
          <span>{isStreaming ? 'Thinking…' : 'Reasoning'}</span>
          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2 text-[11px] leading-relaxed text-text-muted/90 font-mono whitespace-pre-wrap">
          {reasoning}
        </div>
      </details>
    </div>
  );
}
