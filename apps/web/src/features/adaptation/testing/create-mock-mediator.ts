import {
  QUEUED_RESULT,
  RequestType,
  type AcceptAdaptationRequest,
  type DeclineAdaptationRequest,
  type Mediator,
  type Queued,
  type Request,
} from '@stamina/app-core';
import {
  AdaptationRejection,
  RecordStatus,
  type AcceptAdaptationResult,
  type Adaptation,
  type DeclineAdaptationResult,
} from '@stamina/contracts';
import { AdaptationStatus } from '@stamina/domain';

export { QUEUED_RESULT as QUEUED };

/** What the mock answers to the next accept: a result, or an error to reject with. */
export type MockAcceptOutcome = AcceptAdaptationResult | Queued | Error;
export type MockDeclineOutcome = DeclineAdaptationResult | Queued | Error;

export const STALE: AcceptAdaptationResult = {
  status: RecordStatus.Rejected,
  reason: AdaptationRejection.Stale,
  program: null,
};

export const ALREADY_DECIDED: AcceptAdaptationResult = {
  status: RecordStatus.Rejected,
  reason: AdaptationRejection.AlreadyDecided,
  program: null,
};

function decided(adaptation: Adaptation, status: AdaptationStatus): Adaptation {
  return { ...adaptation, status, decidedAt: '2026-11-05T10:00:00.000Z' };
}

/**
 * A mediator that answers the suggestion requests from what the test sets, drops a decided card
 * from the list the way the app does, and records what was sent.
 */
export function createMockMediator() {
  const state = {
    /** The pending list the next read answers with. */
    adaptations: [] as Adaptation[],
    listError: undefined as Error | undefined,
    /** Undefined: answer `Saved`. */
    acceptOutcome: undefined as MockAcceptOutcome | undefined,
    declineOutcome: undefined as MockDeclineOutcome | undefined,
  };
  const requests: Request[] = [];
  const accepted: Adaptation[] = [];
  const declined: string[] = [];

  function drop(id: string) {
    state.adaptations = state.adaptations.filter((adaptation) => adaptation.id !== id);
  }

  async function answer(request: Request): Promise<unknown> {
    switch (request.type) {
      case RequestType.GetAdaptations:
        if (state.listError) throw state.listError;
        return [...state.adaptations];
      case RequestType.GetProgram:
        return null;
      case RequestType.AcceptAdaptation: {
        const { adaptation } = request as AcceptAdaptationRequest;
        accepted.push(adaptation);
        drop(adaptation.id);
        if (state.acceptOutcome instanceof Error) throw state.acceptOutcome;
        // The composable never reads the Program a `Saved` answer carries.
        return (
          state.acceptOutcome ??
          ({
            status: RecordStatus.Saved,
            recorded: true,
            adaptation: decided(adaptation, AdaptationStatus.Accepted),
            program: null,
          } as unknown as AcceptAdaptationResult)
        );
      }
      case RequestType.DeclineAdaptation: {
        const { adaptationId } = request as DeclineAdaptationRequest;
        declined.push(adaptationId);
        const adaptation = state.adaptations.find(({ id }) => id === adaptationId);
        drop(adaptationId);
        if (state.declineOutcome instanceof Error) throw state.declineOutcome;
        if (state.declineOutcome) return state.declineOutcome;
        if (!adaptation) throw new Error(`unknown adaptation ${adaptationId}`);
        return {
          status: RecordStatus.Saved,
          recorded: true,
          adaptation: decided(adaptation, AdaptationStatus.Declined),
        } satisfies DeclineAdaptationResult;
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

  return { mediator, state, requests, accepted, declined };
}
