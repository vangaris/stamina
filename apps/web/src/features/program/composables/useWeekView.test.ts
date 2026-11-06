import { finishSession, getSessionDetail, logSet } from '@stamina/app-core';
import { newId } from '@stamina/ids';
import { describe, expect, it, vi } from 'vitest';
import { ProgramMessageKey } from '../enums/program-message-key.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import { SessionProgress } from '../enums/session-progress.ts';
import { setupProgram } from '../testing/setup-program.ts';
import { useWeekView } from './useWeekView.ts';

describe('useWeekView', () => {
  it('lists the stored week by date, free days included', async () => {
    const { mediator, services } = await setupProgram();
    await services.api.createProgram();
    const flow = useWeekView({ onNavigate: vi.fn(), mediator });

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Ready);
    expect(flow.days.value).toHaveLength(7);
    expect(flow.days.value.filter(({ session }) => session)).toHaveLength(3);
  });

  it('says there is no Program yet instead of creating one', async () => {
    const { mediator, services } = await setupProgram();
    const flow = useWeekView({ onNavigate: vi.fn(), mediator });

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Unavailable);
    expect(flow.messageKey.value).toBe(ProgramMessageKey.NoProgramYet);
    expect(await services.api.getProgram()).toBeNull();
  });

  describe('Session details', () => {
    async function weekWithSessions() {
      const setup = await setupProgram();
      const created = await setup.services.api.createProgram();
      if (!('program' in created)) throw new Error('no Program');
      const flow = useWeekView({ onNavigate: vi.fn(), mediator: setup.mediator });
      return { ...setup, flow, sessions: created.program.sessions };
    }

    it('asks for every Session once the week shows, so each opens without signal', async () => {
      const { flow, services, sessions } = await weekWithSessions();

      await flow.load();

      for (const session of sessions) {
        expect((await services.planCache.readSessionDetail(session.id))?.id).toBe(session.id);
      }
    });

    it('marks Sessions not started, in progress or done from what is logged', async () => {
      const { flow, mediator, sessions } = await weekWithSessions();
      const [first, second] = sessions;
      const exercise = (await mediator.send(getSessionDetail(first!.id))).exercises[0]!;
      await mediator.send(
        logSet(first!.id, {
          id: newId(),
          exerciseId: exercise.exerciseId,
          setNumber: 1,
          weightKg: 20,
          reps: 6,
          rpe: 7,
        }),
      );
      await mediator.send(finishSession(second!.id, { id: newId(), rpe: 7 }));

      await flow.load();

      expect(flow.progress.value[first!.id]).toBe(SessionProgress.InProgress);
      expect(flow.progress.value[second!.id]).toBe(SessionProgress.Done);
      expect(flow.progress.value[sessions[2]!.id]).toBe(SessionProgress.NotStarted);
    });

    it('still shows the week, with every Session ready to start, when the details cannot be fetched', async () => {
      const { flow, mediator, services, sessions } = await weekWithSessions();
      await flow.load();
      services.api.getSession = async () => {
        throw new TypeError('Failed to fetch');
      };
      services.planCache.readSessionDetail = async () => undefined;
      const offline = useWeekView({ onNavigate: vi.fn(), mediator });

      await offline.load();

      expect(offline.phase.value).toBe(ProgramPhase.Ready);
      expect(Object.keys(offline.progress.value)).toHaveLength(sessions.length);
      expect(Object.values(offline.progress.value)).toEqual(
        sessions.map(() => SessionProgress.NotStarted),
      );
    });
  });
});
