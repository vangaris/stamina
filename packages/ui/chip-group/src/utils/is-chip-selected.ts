import type { ChipGroupModel, ChipGroupValue } from '../types.ts';

/** Whether `value` is on in `model` (array membership in multiple mode, equality in single). */
export function isChipSelected(model: ChipGroupModel, value: ChipGroupValue): boolean {
  return Array.isArray(model) ? model.includes(value) : model === value;
}
