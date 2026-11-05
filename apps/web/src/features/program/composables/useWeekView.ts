import { getProgram } from '@stamina/app-core';
import { computed } from 'vue';
import { ProgramMessageKey } from '../enums/program-message-key.ts';
import { ProgramOutcomeKind } from '../enums/program-outcome-kind.ts';
import type { UseProgramOptions } from '../types.ts';
import { buildWeekDays } from '../utils/build-week-days.ts';
import { useProgramLoad } from './useProgramLoad.ts';

/** The week view: the stored week by date, free days included. Never creates a Program. */
export function useWeekView(options: UseProgramOptions) {
  const loaded = useProgramLoad(options, async (mediator) => {
    const program = await mediator.send(getProgram());
    return program
      ? { kind: ProgramOutcomeKind.Week, program }
      : { kind: ProgramOutcomeKind.Unavailable, messageKey: ProgramMessageKey.NoProgramYet };
  });

  const days = computed(() => (loaded.program.value ? buildWeekDays(loaded.program.value) : []));

  return { ...loaded, days };
}
