import type { ChipGroupOption } from '@stamina/ui-chip-group';
import { toOptions } from '../../onboarding/index.ts';
import { BODY_AREAS } from '../../safety/index.ts';

/** The body areas as chips, labelled in the person's language. */
export function toAreaOptions(t: (key: string) => string): ChipGroupOption[] {
  return toOptions(BODY_AREAS, (area) => t(`screening.bodyAreas.options.${area}`));
}
