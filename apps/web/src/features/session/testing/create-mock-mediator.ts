import {
  RequestType,
  QUEUED_RESULT,
  type FinishSessionRequest,
  type LogSetRequest,
  type Mediator,
  type Queued,
  type Request,
} from '@stamina/app-core';
import {
  RecordStatus,
  SessionRejection,
  type FinishSession,
  type LogSet,
  type LogSetResult,
  type SessionDetail,
} from '@stamina/contracts';
import { sessionLoad } from '@stamina/domain';
import { addLoggedSet } from '../utils/add-logged-set.ts';

/** What the mock answers to the next `LogSet`: a result, or an error to reject with. */
export type MockLogOutcome = LogSetResult | Queued | Error;

export const SAVED: LogSetResult = { status: RecordStatus.Saved, recorded: true };
export const REJECTED: LogSetResult = {
  status: RecordStatus.Rejected,
  reason: SessionRejection.SessionFinished,
};
export { QUEUED_RESULT as QUEUED };

/**
 * A mediator that plays the Session requests against one Session held in memory, the way the app
 * does: a set or a finish is on the Session at once (it is written on the device first), whatever
 * the outcome says about the server. Tests set what comes back and read what was sent.
 */
export function createMockMediator(initial: SessionDetail) {
  const state = {
    detail: initial,
    logOutcome: SAVED as MockLogOutcome,
    finishOutcome: undefined as Queued | Error | undefined,
    loadError: undefined as Error | undefined,
    /** While set, a `LogSet` waits for it before it is answered: a slow network. */
    gate: undefined as Promise<void> | undefined,
  };
  const requests: Request[] = [];
  const sets: LogSet[] = [];
  const finishes: FinishSession[] = [];

  function storeSet(set: LogSet) {
    const exercise = state.detail.exercises.find(({ exerciseId, easier, harder }) =>
      [exerciseId, easier?.exerciseId, harder?.exerciseId].includes(set.exerciseId),
    );
    if (exercise) state.detail = addLoggedSet(state.detail, exercise.id, set);
  }

  async function answer(request: Request): Promise<unknown> {
    switch (request.type) {
      case RequestType.GetSessionDetail:
        if (state.loadError) throw state.loadError;
        return state.detail;
      case RequestType.LogSet: {
        const { set } = request as LogSetRequest;
        sets.push(set);
        await state.gate;
        const outcome = state.logOutcome;
        if (outcome instanceof Error) throw outcome;
        if (isStored(outcome)) storeSet(set);
        return outcome;
      }
      case RequestType.FinishSession: {
        const { finish } = request as FinishSessionRequest;
        finishes.push(finish);
        if (state.finishOutcome instanceof Error) throw state.finishOutcome;
        const minutes = finish.minutes ?? state.detail.minutes;
        const finished = {
          id: finish.id,
          rpe: finish.rpe,
          minutes,
          load: sessionLoad(finish.rpe, minutes),
          finishedAt: new Date().toISOString(),
        };
        state.detail = { ...state.detail, finished };
        return state.finishOutcome ?? { status: RecordStatus.Saved, recorded: true, finished };
      }
      default:
        throw new Error(`unexpected request ${request.type}`);
    }
  }

  const mediator = {
    send: async (request: Request) => {
      requests.push(request);
      return answer(request);
    },
  } as Mediator;

  return { mediator, state, requests, sets, finishes };
}

function isStored(outcome: LogSetResult | Queued): boolean {
  return 'queued' in outcome || outcome.status === RecordStatus.Saved;
}
