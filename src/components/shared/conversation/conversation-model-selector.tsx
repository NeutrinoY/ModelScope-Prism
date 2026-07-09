'use client';

import { BrainCircuit, LayoutPanelTop, Settings2 } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useState } from 'react';
import type { ThinkingRequestControl } from '@/lib/contracts';
import { BUILTIN_CONVERSATION_MODELS, getModelProfile, isBuiltinModel } from '@/lib/domain';
import { cn } from '@/lib/utils';

/**
 * Conversation model selector: full picker on empty sessions, compact
 * summary once messages exist (inheriting the legacy layout animation).
 * Selecting "Custom" opens Settings where the model ID is typed in.
 */
export function ConversationModelSelector({
  modelId,
  onModelChange,
  thinking,
  hasMessages,
  onOpenSettings,
  layoutId,
}: {
  modelId: string;
  onModelChange: (modelId: string) => void;
  thinking: ThinkingRequestControl;
  hasMessages: boolean;
  onOpenSettings: () => void;
  layoutId: string;
}) {
  const [forceShow, setForceShow] = useState(false);
  const profile = getModelProfile(modelId);
  const isCustom = !isBuiltinModel(modelId);

  const thinkingLabel =
    thinking.mode === 'auto'
      ? 'Thinking Auto'
      : thinking.mode === 'on'
        ? 'Thinking On'
        : 'Thinking Off';

  const showFull = !hasMessages || forceShow;

  return (
    <div className="w-full px-4 pt-1 pb-1 z-30 flex-none">
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {showFull ? (
            <motion.div
              key="full-selector"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-surface/60 border border-border/60 rounded-panel p-1.5 flex items-stretch gap-1 min-h-[56px] overflow-x-auto snap-x snap-mandatory scrollbar-none md:overflow-visible"
            >
              <LayoutGroup id={layoutId}>
                {BUILTIN_CONVERSATION_MODELS.map((model) => {
                  const isSelected = modelId === model.id;
                  const supportsImage =
                    model.input.imageUrl === true || model.input.imageDataUrl === true;
                  return (
                    <button
                      type="button"
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setForceShow(false);
                      }}
                      className={cn(
                        'flex-none w-[100px] md:w-auto md:flex-1 snap-center rounded-lg text-[11px] font-medium transition-colors flex flex-col items-center justify-center gap-1 relative py-1.5',
                        isSelected ? 'text-foreground' : 'text-text-muted hover:bg-background/40'
                      )}
                    >
                      <span className="font-semibold z-10 truncate max-w-full px-1">
                        {model.label}
                      </span>
                      {supportsImage ? (
                        <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-accent-soft text-accent border border-accent/20 font-semibold font-mono tracking-wider uppercase scale-90">
                          Vision
                        </span>
                      ) : (
                        <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-surface-muted text-text-muted font-mono tracking-wider uppercase scale-90">
                          Text
                        </span>
                      )}
                      {isSelected && (
                        <motion.div
                          layoutId={`${layoutId}-active`}
                          className="absolute inset-0 bg-surface-elevated shadow-sm border border-border rounded-lg"
                          style={{ zIndex: 0 }}
                        />
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className={cn(
                    'flex-none w-[100px] md:w-auto md:flex-1 snap-center rounded-lg text-[11px] font-medium transition-colors flex flex-col items-center justify-center gap-1.5 relative py-1.5',
                    isCustom ? 'text-foreground' : 'text-text-muted hover:bg-background/40'
                  )}
                >
                  <span className="font-semibold z-10 truncate max-w-full px-1">
                    {isCustom ? profile.label : 'Custom'}
                  </span>
                  <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-surface-muted text-text-muted font-mono tracking-wider uppercase scale-90 flex items-center gap-0.5">
                    Config <Settings2 className="h-2.5 w-2.5" />
                  </span>
                  {isCustom && (
                    <motion.div
                      layoutId={`${layoutId}-active`}
                      className="absolute inset-0 bg-surface-elevated shadow-sm border border-border rounded-lg"
                      style={{ zIndex: 0 }}
                    />
                  )}
                </button>
              </LayoutGroup>
            </motion.div>
          ) : (
            <motion.div
              key="compact-selector"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-4 py-2 bg-surface/40 border border-border/50 rounded-lg backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-medium text-text-muted shrink-0">Model:</span>
                <span className="text-xs font-semibold truncate">{profile.label}</span>
                <div
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border shrink-0',
                    thinking.mode === 'on'
                      ? 'bg-accent-soft text-accent border-accent/20'
                      : 'bg-surface-muted text-text-muted border-transparent'
                  )}
                >
                  <BrainCircuit className="h-2.5 w-2.5" />
                  {thinkingLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForceShow(true)}
                className="h-7 text-[10px] gap-1 hover:bg-background rounded-md px-2 inline-flex items-center text-text-secondary transition-colors shrink-0"
              >
                <LayoutPanelTop className="h-3 w-3" /> Change model
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
