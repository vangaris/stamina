import { RequestType, type GetSessionDetail, type Mediator, type Request } from '@stamina/app-core';
import type { ProgramWeek, WeekLoad } from '@stamina/contracts';
import { makeProgram } from './make-program.ts';
import { makeWeekLoad } from './make-week-load.ts';

/** The part of a Session's detail that tells where it stands. */
export interface MockSessionDetail {
  finished: unknown;
  exercises: { loggedSets: unknown[] }[];
}

/**
 * A mediator that answers the Program, the week's Load and a Session's detail from what the test
 * sets, and records what was sent.
 */
export function createMockMediator() {
  const state = {
    program: makeProgram() as ProgramWeek | null,
    programError: undefined as Error | undefined,
    week: makeWeekLoad() as WeekLoad,
    weekError: undefined as Error | undefined,
    /** Undefined: the Session has no detail (nothing logged on this device). */
    detail: undefined as MockSessionDetail | undefined,
    detailError: undefined as Error | undefined,
  };
  const requests: Request[] = [];

  function answer(request: Request): unknown {
    switch (request.type) {
      case RequestType.GetProgram:
        if (state.programError) throw state.programError;
        return state.program;
      case RequestType.GetWeekLoad:
        if (state.weekError) throw state.weekError;
        return state.week;
      case RequestType.GetSessionDetail: {
        if (state.detailError) throw state.detailError;
        const { sessionId } = request as GetSessionDetail;
        return state.detail ?? { id: sessionId, finished: null, exercises: [] };
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

  return { mediator, state, requests };
}
