import { getProgram, getSessionDetail } from '@stamina/app-core';
import type { ProgramSession, SessionDetail } from '@stamina/contracts';
import { computed, ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { ProgramMessageKey } from '../enums/program-message-key.ts';
import { ProgramOutcomeKind } from '../enums/program-outcome-kind.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import type { SessionProgress } from '../enums/session-progress.ts';
import type { UseProgramOptions } from '../types.ts';
import { buildWeekDays } from '../utils/build-week-days.ts';
import { toSessionProgress } from '../utils/to-session-progress.ts';
import { useProgramLoad } from './useProgramLoad.ts';

/**
 * The week view: the stored week by date, free days included. Never creates a Program. Once the
 * week shows it asks for every Session's detail, which also caches it so the Session opens
 * without signal, and marks each Session as not started, in progress or done.
 */
export function useWeekView(options: UseProgramOptions) {
  const mediator = options.mediator ?? useMediator();
  const loaded = useProgramLoad(options, async (active) => {
    const program = await active.send(getProgram());
    return program
      ? { kind: ProgramOutcomeKind.Week, program }
      : { kind: ProgramOutcomeKind.Unavailable, messageKey: ProgramMessageKey.NoProgramYet };
  });
  const progress = ref<Record<string, SessionProgress>>({});

  const days = computed(() => (loaded.program.value ? buildWeekDays(loaded.program.value) : []));

  function setProgress(
    sessions: readonly ProgramSession[],
    details: readonly (SessionDetail | undefined)[],
  ) {
    progress.value = Object.fromEntries(
      sessions.map((session, index) => [
        session.id,
        toSessionProgress(session.status, details[index]),
      ]),
    );
  }

  async function load() {
    await loaded.load();
    const program = loaded.program.value;
    if (loaded.phase.value !== ProgramPhase.Ready || !program) return;
    setProgress(program.sessions, []);
    // Best effort: a Session that cannot be fetched now is fetched when it is opened.
    const details = await Promise.all(
      program.sessions.map((session) =>
        mediator.send(getSessionDetail(session.id)).catch(() => undefined),
      ),
    );
    setProgress(program.sessions, details);
  }

  return { ...loaded, days, progress, load };
}
