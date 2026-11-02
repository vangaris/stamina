import type { ChipGroupValue } from '@stamina/ui-chip-group';
import { YesNo } from '../enums/yes-no.ts';

/** The answer a single-choice chip group handed back; `undefined` when it holds neither chip. */
export function fromYesNo(model: ChipGroupValue | null | ChipGroupValue[]): boolean | undefined {
  if (model === YesNo.Yes) return true;
  if (model === YesNo.No) return false;
  return undefined;
}
