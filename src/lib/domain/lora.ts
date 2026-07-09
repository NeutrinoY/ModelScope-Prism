import { IMAGE_PARAM_RANGES, type LoraItem, type LoraRequest } from '../contracts';

/**
 * LoRA validation and payload-shape selection (docs/rebuild/03 + 05).
 *
 * 0 items -> do not send loras
 * 1 item  -> send the repo id string
 * n items -> send { repoId: weight } object; weights must sum to 1.0
 */

export type LoraValidation =
  | { ok: true }
  | { ok: false; reason: 'too_many' | 'empty_model_id' | 'weight_sum' | 'weight_range' };

export function validateLoraRequest(request: LoraRequest): LoraValidation {
  const items = request.items;
  if (items.length === 0) return { ok: true };
  if (items.length > IMAGE_PARAM_RANGES.loraMaxCount) {
    return { ok: false, reason: 'too_many' };
  }
  if (items.some((item) => !item.modelId.trim())) {
    return { ok: false, reason: 'empty_model_id' };
  }
  if (items.some((item) => item.weight < 0 || item.weight > 1)) {
    return { ok: false, reason: 'weight_range' };
  }
  if (items.length > 1) {
    const sum = items.reduce((total, item) => total + item.weight, 0);
    if (
      Math.abs(sum - IMAGE_PARAM_RANGES.loraWeightSumTarget) >
      IMAGE_PARAM_RANGES.loraWeightSumTolerance
    ) {
      return { ok: false, reason: 'weight_sum' };
    }
  }
  return { ok: true };
}

export function loraWeightSum(items: LoraItem[]): number {
  return items.reduce((total, item) => total + item.weight, 0);
}

/**
 * Distribute weights evenly across items so they sum to exactly 1.0
 * (the last item absorbs rounding remainder).
 */
export function balanceLoraWeights(items: LoraItem[]): LoraItem[] {
  const count = items.length;
  if (count === 0) return items;
  const even = Number((1 / count).toFixed(2));
  return items.map((item, index) => ({
    ...item,
    weight: index === count - 1 ? Number((1 - even * (count - 1)).toFixed(2)) : even,
  }));
}

/** Convert a validated LoraRequest into the ModelScope payload shape. */
export function toLoraPayload(
  request: LoraRequest | undefined
): string | Record<string, number> | undefined {
  if (!request) return undefined;
  const items = request.items.filter((item) => item.modelId.trim());
  if (items.length === 0) return undefined;
  if (items.length === 1) return items[0].modelId.trim();

  const payload: Record<string, number> = {};
  for (const item of items) {
    payload[item.modelId.trim()] = item.weight;
  }
  return payload;
}
