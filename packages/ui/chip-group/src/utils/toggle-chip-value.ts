import type { ChipGroupModel, ChipGroupValue } from '../types.ts';
import { isChipSelected } from './is-chip-selected.ts';

/**
 * The model after a chip with `value` is clicked. Multiple: adds or removes it. Single: selects
 * it; clicking the selected one clears the model only with `allowDeselect`, else changes nothing.
 */
export function toggleChipValue(
  model: ChipGroupModel,
  value: ChipGroupValue,
  options: { multiple: boolean; allowDeselect: boolean },
): ChipGroupModel {
  if (options.multiple) {
    const current = Array.isArray(model) ? model : [];
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  }
  if (isChipSelected(model, value)) return options.allowDeselect ? null : model;
  return value;
}
