import type { ChipGroupValue } from '@stamina/ui-chip-group';

/**
 * What a `ChipGroup` hands back is a plain string or number. These two give it back as the
 * enum the options were built from. The caller must build the options from that enum's values
 * (the only values the group can return), which is what makes the narrowing sound.
 */
export function pickedOne<T extends string>(
  model: ChipGroupValue | null | ChipGroupValue[],
): T | undefined {
  return typeof model === 'string' ? (model as T) : undefined;
}

/** For a group that always has one chosen: keeps `current` if the group somehow hands back nothing. */
export function pickedOneOr<T extends string>(
  model: ChipGroupValue | null | ChipGroupValue[],
  current: T,
): T {
  return pickedOne<T>(model) ?? current;
}

export function pickedMany<T extends string>(model: ChipGroupValue | null | ChipGroupValue[]): T[] {
  return Array.isArray(model) ? (model.filter((v) => typeof v === 'string') as T[]) : [];
}

/** A single number chosen in a `ChipGroup` whose options are numbers. */
export function pickedNumber(model: ChipGroupValue | null | ChipGroupValue[]): number | undefined {
  return typeof model === 'number' ? model : undefined;
}
