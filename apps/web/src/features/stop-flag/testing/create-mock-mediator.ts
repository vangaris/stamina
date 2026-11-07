import {
  QUEUED_RESULT,
  RequestType,
  SafetyStatus,
  type Mediator,
  type Queued,
  type ConfirmDoctorSeenRequest,
  type RecheckScreeningRequest,
  type ReportStopFlagRequest,
  type Request,
  type SafetyState,
} from '@stamina/app-core';
import {
  RecordStatus,
  type ConfirmDoctorSeenResult,
  type RecheckScreening,
  type ReportStopFlag,
  type ReportStopFlagResult,
  type SaveScreeningResult,
} from '@stamina/contracts';
import type { StopFlag } from '@stamina/domain';
import { makeScreening, makeStop } from './make-safety-state.ts';

export { QUEUED_RESULT as QUEUED };

/** What the mock answers to the next request of a kind: a result, or an error to reject with. */
export type MockOutcome<T> = T | Error;

export function savedReport(): ReportStopFlagResult {
  return {
    status: RecordStatus.Saved,
    recorded: true,
    stop: makeStop(),
  };
}

/**
 * A mediator that answers the stop-flag requests and `GetSafety` from what the test sets, and
 * records what was sent.
 */
export function createMockMediator() {
  const state = {
    /** Undefined: a saved result for what was sent. */
    report: undefined as MockOutcome<ReportStopFlagResult | Queued> | undefined,
    /** Undefined: a saved Screening that allows full training. */
    recheck: undefined as MockOutcome<SaveScreeningResult> | undefined,
    /** Undefined: a saved result with nothing pausing. */
    confirm: undefined as MockOutcome<ConfirmDoctorSeenResult> | undefined,
    safety: {
      status: SafetyStatus.Ready,
      screening: makeScreening(),
      stop: makeStop(),
    } as MockOutcome<SafetyState>,
    /** While set, a `ReportStopFlag` waits for it before it is answered: a slow network. */
    gate: undefined as Promise<void> | undefined,
  };
  const requests: Request[] = [];
  const reports: ReportStopFlag[] = [];
  const rechecks: RecheckScreening[] = [];
  /** The flags each confirmation named. */
  const confirmations: (readonly StopFlag[])[] = [];

  async function answer(request: Request): Promise<unknown> {
    switch (request.type) {
      case RequestType.ReportStopFlag: {
        const { report } = request as ReportStopFlagRequest;
        reports.push(report);
        await state.gate;
        if (state.report instanceof Error) throw state.report;
        return state.report ?? savedReport();
      }
      case RequestType.RecheckScreening: {
        const { recheck } = request as RecheckScreeningRequest;
        rechecks.push(recheck);
        if (state.recheck instanceof Error) throw state.recheck;
        return (
          state.recheck ?? {
            status: RecordStatus.Saved,
            screening: makeScreening(),
            goalChanged: false,
          }
        );
      }
      case RequestType.ConfirmDoctorSeen:
        confirmations.push((request as ConfirmDoctorSeenRequest).flags);
        if (state.confirm instanceof Error) throw state.confirm;
        // Confirming ends every pause: the next `GetSafety` finds the person ready.
        if (!(state.safety instanceof Error) && state.safety.status === SafetyStatus.Paused) {
          state.safety = { ...state.safety, status: SafetyStatus.Ready, stop: makeStop() };
        }
        return state.confirm ?? { status: RecordStatus.Saved, stop: makeStop() };
      case RequestType.GetSafety:
        if (state.safety instanceof Error) throw state.safety;
        return state.safety;
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

  return { mediator, state, requests, reports, rechecks, confirmations };
}
