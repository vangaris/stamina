import { createProgram } from '@stamina/app-core';
import { ProgramRejection, RecordStatus } from '@stamina/contracts';
import { RoutePath } from '../../../enums/route-path.ts';
import { MESSAGE_FOR_REJECTION, ROUTE_AFTER_REVEAL } from '../config.ts';
import { ProgramOutcomeKind } from '../enums/program-outcome-kind.ts';
import type { UseProgramOptions } from '../types.ts';
import { useProgramLoad } from './useProgramLoad.ts';

/**
 * The reveal: asks the server to create the Program (a repeat returns the stored one, so
 * reloading is safe) and shows its first week. A referral leaves for the Referred screen; any
 * other refusal is explained calmly, with a way on to Today.
 */
export function useReveal(options: UseProgramOptions) {
  const loaded = useProgramLoad(options, async (mediator) => {
    const result = await mediator.send(createProgram());
    if (result.status === RecordStatus.Saved) {
      return { kind: ProgramOutcomeKind.Week, program: result.program };
    }
    if (result.reason === ProgramRejection.Referred) {
      return { kind: ProgramOutcomeKind.Leave, path: RoutePath.Referred };
    }
    return {
      kind: ProgramOutcomeKind.Unavailable,
      messageKey: MESSAGE_FOR_REJECTION[result.reason],
    };
  });

  function continueOn() {
    options.onNavigate(ROUTE_AFTER_REVEAL);
  }

  return { ...loaded, continueOn };
}
