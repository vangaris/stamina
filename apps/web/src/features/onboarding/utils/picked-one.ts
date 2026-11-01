import type { ChipGroupValue } from '@stamina/ui-chip-group';

/**
 * What a single-choice `ChipGroup` handed back, as one of the `values` its options were built
 * from; `undefined` when the group is cleared or holds anything else.
 */
export function pickedOne<T extends ChipGroupValue>(
  model: ChipGroupValue | null | ChipGroupValue[],
  values: readonly T[],
): T | undefined {
  return values.find((value) => value === model);
}
