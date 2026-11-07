import {
  QUEUED_RESULT,
  RequestType,
  type Mediator,
  type Queued,
  type Request,
  type SubmitCheckinRequest,
} from '@stamina/app-core';
import {
  RecordStatus,
  type Checkin,
  type SubmitCheckin,
  type SubmitCheckinResult,
} from '@stamina/contracts';

/** What the mock answers to the next `SubmitCheckin`: a result, or an error to reject with. */
export type MockSubmitOutcome = SubmitCheckinResult | Queued | Error;

export { QUEUED_RESULT as QUEUED };

export function savedResult(checkin: SubmitCheckin): SubmitCheckinResult {
  return {
    status: RecordStatus.Saved,
    recorded: true,
    checkin: { ...checkin, submittedAt: '2026-11-06T12:00:00.000Z' },
  };
}

export function makeCheckin(overrides: Partial<Checkin> = {}): Checkin {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    date: '2026-11-06',
    sleep: 4,
    soreness: 2,
    energy: 3,
    submittedAt: '2026-11-06T07:00:00.000Z',
    ...overrides,
  };
}

/** A mediator that answers the latest Check-in and "submit" requests from what the test sets, and records what was sent. */
export function createMockMediator() {
  const state = {
    /** What the server holds as the latest Check-in. */
    latest: null as Checkin | null,
    latestError: undefined as Error | undefined,
    /** Undefined: answer with a saved result for what was sent. */
    submitOutcome: undefined as MockSubmitOutcome | undefined,
    /** While set, a `SubmitCheckin` waits for it before it is answered: a slow network. */
    gate: undefined as Promise<void> | undefined,
  };
  const requests: Request[] = [];
  const checkins: SubmitCheckin[] = [];

  async function answer(request: Request): Promise<unknown> {
    switch (request.type) {
      case RequestType.GetLatestCheckin:
        if (state.latestError) throw state.latestError;
        return state.latest;
      case RequestType.SubmitCheckin: {
        const { checkin } = request as SubmitCheckinRequest;
        checkins.push(checkin);
        await state.gate;
        if (state.submitOutcome instanceof Error) throw state.submitOutcome;
        return state.submitOutcome ?? savedResult(checkin);
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

  return { mediator, state, requests, checkins };
}
