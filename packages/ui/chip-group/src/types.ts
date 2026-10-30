export type ChipGroupValue = string | number;

export interface ChipGroupOption {
  value: ChipGroupValue;
  label: string;
  disabled?: boolean;
}

/** Single: the value or `null`. Multiple: the array of selected values. */
export type ChipGroupModel = ChipGroupValue | null | ChipGroupValue[];

export interface ChipGroupProps {
  options: ChipGroupOption[];
  /** The group's accessible name; shown as a visible label unless `labelHidden`. */
  label: string;
  labelHidden?: boolean;
  /** Several chips can be on (checkbox chips). Otherwise exactly one (radio chips). */
  multiple?: boolean;
  /** Single mode only: clicking the selected chip clears the selection. */
  allowDeselect?: boolean;
}
