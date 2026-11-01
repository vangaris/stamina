import type { ChipGroupOption } from '@stamina/ui-chip-group';

/** One chip option per value, labelled by `label`. The values are what the group hands back. */
export function toOptions<T extends string | number>(
  values: readonly T[],
  label: (value: T) => string,
): ChipGroupOption[] {
  return values.map((value) => ({ value, label: label(value) }));
}
