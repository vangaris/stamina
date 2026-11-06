import {
  ProfileStatus,
  QUEUED_RESULT,
  RequestType,
  type LogActivityRequest,
  type Mediator,
  type ProfileState,
  type Queued,
  type Request,
} from '@stamina/app-core';
import {
  RecordStatus,
  ActivityRejection,
  type LogActivity,
  type LogActivityResult,
  type SavedProfile,
  type WeekLoad,
} from '@stamina/contracts';
import { ActivitySource, activityLoad, activityRpe } from '@stamina/domain';
import { makeSavedProfile } from './make-saved-profile.ts';
import { makeWeekLoad } from './make-week-load.ts';

/** What the mock answers to the next `LogActivity`: a result, or an error to reject with. */
export type MockLogOutcome = LogActivityResult | Queued | Error;

export { QUEUED_RESULT as QUEUED };

export const REJECTED: LogActivityResult = {
  status: RecordStatus.Rejected,
  reason: ActivityRejection.DateOutOfRange,
};

export function savedResult(activity: LogActivity): LogActivityResult {
  return {
    status: RecordStatus.Saved,
    recorded: true,
    activity: {
      ...activity,
      rpe: activityRpe(activity.intensity),
      load: activityLoad(activity.intensity, activity.minutes),
      planned: false,
      source: ActivitySource.Manual,
      loggedAt: '2026-11-06T12:00:00.000Z',
    },
  };
}

/**
 * A mediator that answers the profile, the week's Load and "I played" requests from what the
 * test sets, and records what was sent.
 */
export function createMockMediator() {
  const state = {
    profile: { status: ProfileStatus.Present, profile: makeSavedProfile() } as ProfileState,
    profileError: undefined as Error | undefined,
    /** Undefined: answer with a saved result for what was sent. */
    logOutcome: undefined as MockLogOutcome | undefined,
    week: makeWeekLoad() as WeekLoad,
    weekError: undefined as Error | undefined,
    /** While set, a `LogActivity` waits for it before it is answered: a slow network. */
    gate: undefined as Promise<void> | undefined,
  };
  const requests: Request[] = [];
  const activities: LogActivity[] = [];

  async function answer(request: Request): Promise<unknown> {
    switch (request.type) {
      case RequestType.GetProfile:
        if (state.profileError) throw state.profileError;
        return state.profile;
      case RequestType.GetWeekLoad:
        if (state.weekError) throw state.weekError;
        return state.week;
      case RequestType.LogActivity: {
        const { activity } = request as LogActivityRequest;
        activities.push(activity);
        await state.gate;
        if (state.logOutcome instanceof Error) throw state.logOutcome;
        return state.logOutcome ?? savedResult(activity);
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

  function setProfile(profile: SavedProfile) {
    state.profile = { status: ProfileStatus.Present, profile };
  }

  return { mediator, state, requests, activities, setProfile };
}
