import { AppError, AppErrorCode, type Mediator } from '@stamina/app-core';
import type { ProgramWeek } from '@stamina/contracts';
import { ref } from 'vue';
import { RoutePath } from '../../../enums/route-path.ts';
import { useMediator } from '../../../mediator.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { LOAD_ERROR_KEYS } from '../config.ts';
import { ProgramMessageKey } from '../enums/program-message-key.ts';
import { ProgramOutcomeKind } from '../enums/program-outcome-kind.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import type { ProgramOutcome, UseProgramOptions } from '../types.ts';

/**
 * What the two Program screens share: ask for the week, then show it, explain why there is none,
 * leave for the screen the answer points to, or show a retry. A signed-out person goes back to
 * the start. The week is never logged (the pipeline logs no results).
 */
export function useProgramLoad(
  options: UseProgramOptions,
  request: (mediator: Mediator) => Promise<ProgramOutcome>,
) {
  const mediator = options.mediator ?? useMediator();
  const phase = ref(ProgramPhase.Loading);
  const program = ref<ProgramWeek | undefined>();
  const messageKey = ref<ProgramMessageKey | undefined>();

  async function load() {
    phase.value = ProgramPhase.Loading;
    messageKey.value = undefined;
    try {
      const outcome = await request(mediator);
      if (outcome.kind === ProgramOutcomeKind.Leave) return options.onNavigate(outcome.path);
      if (outcome.kind === ProgramOutcomeKind.Unavailable) {
        messageKey.value = outcome.messageKey;
        phase.value = ProgramPhase.Unavailable;
        return;
      }
      program.value = outcome.program;
      phase.value = ProgramPhase.Ready;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onNavigate(RoutePath.Start);
      }
      messageKey.value = toMessageKey(error, LOAD_ERROR_KEYS, ProgramMessageKey.Unknown);
      phase.value = ProgramPhase.Failed;
    }
  }

  return { phase, program, messageKey, load };
}
