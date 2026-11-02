import type { ChipGroupValue } from '@stamina/ui-chip-group';

/**
 * What a multiple-choice `ChipGroup` handed back, as those of the `values` its options were
 * built from that are on, in the order of `values` (so days stay in week order).
 */
export function pickedMany<T extends ChipGroupValue>(
  model: ChipGroupValue | null | ChipGroupValue[],
  values: readonly T[],
): T[] {
  return Array.isArray(model) ? values.filter((value) => model.includes(value)) : [];
}
