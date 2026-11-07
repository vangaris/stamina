import {
  RequestType,
  type LogWeighInRequest,
  type Mediator,
  type Request,
} from '@stamina/app-core';
import type { LogWeighIn, Progress } from '@stamina/contracts';
import { makeProgress } from './make-progress.ts';

/** The day the server dates a weigh-in that names none. */
export const SERVER_TODAY = '2026-11-07';

/** The person's clock in tests: midday on `SERVER_TODAY`, on their calendar. */
export const LOCAL_NOW = new Date(2026, 10, 7, 12);

/**
 * A mediator that answers Progress and weigh-in requests from what the test sets, and records
 * what was sent.
 */
export function createMockMediator() {
  const state = {
    progress: makeProgress() as Progress,
    progressError: undefined as Error | undefined,
    weighInError: undefined as Error | undefined,
    /** While set, a `LogWeighIn` waits for it before it is answered: a slow network. */
    gate: undefined as Promise<void> | undefined,
  };
  const requests: Request[] = [];
  const weighIns: LogWeighIn[] = [];

  async function answer(request: Request): Promise<unknown> {
    switch (request.type) {
      case RequestType.GetProgress:
        if (state.progressError) throw state.progressError;
        return state.progress;
      case RequestType.LogWeighIn: {
        const { weighIn } = request as LogWeighInRequest;
        weighIns.push(weighIn);
        await state.gate;
        if (state.weighInError) throw state.weighInError;
        return { date: weighIn.date ?? SERVER_TODAY, weightKg: weighIn.weightKg };
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

  return { mediator, state, requests, weighIns };
}
