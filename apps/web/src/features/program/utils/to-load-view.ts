import type { ProgramExercise } from '@stamina/contracts';
import { LoadGuidance } from '@stamina/domain';
import { LoadMessageKey } from '../enums/load-message-key.ts';
import type { LoadView } from '../types.ts';

/** How the weight is chosen, or nothing where there is no weight to choose. */
export function toLoadView({ loadGuidance, rir }: ProgramExercise): LoadView | undefined {
  if (loadGuidance === LoadGuidance.RpeGuided && rir !== null) {
    return { key: LoadMessageKey.RpeGuided, params: { rir } };
  }
  if (loadGuidance === LoadGuidance.Bodyweight) {
    return { key: LoadMessageKey.Bodyweight };
  }
  return undefined;
}
