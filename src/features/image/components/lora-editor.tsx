'use client';

import { PlusCircle, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LoraRequest } from '@/lib/contracts';
import { IMAGE_PARAM_RANGES } from '@/lib/contracts';
import { balanceLoraWeights, loraWeightSum } from '@/lib/domain';
import { cn } from '@/lib/utils';

/**
 * LoRA editor (docs/rebuild/03): up to 6 entries; multi-LoRA weights must
 * sum to 1.0. Auto-balance is a UI convenience — the request contract is
 * enforced at the domain/route layer. Compatibility is the user's call.
 */
export function LoraEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: LoraRequest;
  onChange: (value: LoraRequest) => void;
  disabled?: boolean;
}) {
  const items = value.items;
  const totalWeight = loraWeightSum(items);
  const isWeightValid =
    items.length <= 1 ||
    Math.abs(totalWeight - IMAGE_PARAM_RANGES.loraWeightSumTarget) <=
      IMAGE_PARAM_RANGES.loraWeightSumTolerance;

  const addLora = () => {
    if (items.length >= IMAGE_PARAM_RANGES.loraMaxCount) return;
    onChange({ items: balanceLoraWeights([...items, { modelId: '', weight: 0 }]) });
  };

  const removeLora = (index: number) => {
    onChange({ items: balanceLoraWeights(items.filter((_, i) => i !== index)) });
  };

  const updateModelId = (index: number, modelId: string) => {
    onChange({ items: items.map((item, i) => (i === index ? { ...item, modelId } : item)) });
  };

  const updateWeight = (index: number, weight: number) => {
    onChange({ items: items.map((item, i) => (i === index ? { ...item, weight } : item)) });
  };

  const rebalance = () => {
    onChange({ items: balanceLoraWeights(items) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          LoRAs ({items.length}/{IMAGE_PARAM_RANGES.loraMaxCount})
        </Label>
        {items.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={rebalance}
            disabled={disabled}
            className="h-6 text-[10px] px-2 gap-1 text-accent"
          >
            <RotateCcw className="h-3 w-3" /> Balance
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Input
              value={item.modelId}
              disabled={disabled}
              onChange={(event) => updateModelId(index, event.target.value)}
              placeholder="LoRA repo ID"
              className="h-8 text-xs flex-1 min-w-0"
            />
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={item.weight}
              disabled={disabled}
              onChange={(event) => updateWeight(index, Number(event.target.value))}
              className="h-8 w-16 text-xs text-center px-1"
              aria-label="LoRA weight"
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => removeLora(index)}
              className="h-8 w-8 shrink-0 hover:bg-danger/10 hover:text-danger"
              aria-label="Remove LoRA"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {items.length < IMAGE_PARAM_RANGES.loraMaxCount && (
          <Button
            variant="outline"
            size="sm"
            onClick={addLora}
            disabled={disabled}
            className="w-full h-8 text-xs border-dashed gap-2"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Add LoRA
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex justify-between items-center text-[10px] text-text-muted">
          <span>
            Total weight:{' '}
            <span className={cn('font-mono', !isWeightValid && 'text-danger font-bold')}>
              {totalWeight.toFixed(2)}
            </span>
          </span>
          {items.length > 1 && <span>Target: 1.0</span>}
        </div>
      )}
    </div>
  );
}
