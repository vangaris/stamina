import {
  ApiPath,
  HttpMethod,
  StopFlagSubpath,
  confirmDoctorSeenResultSchema,
  reportStopFlagResultSchema,
  safetyStateSchema,
  saveScreeningResultSchema,
  stopFlagPath,
  type RecheckScreening,
  type ReportStopFlag,
} from '@stamina/contracts';
import { BodyArea, StopFlag, type StopState } from '@stamina/domain';
import type { FixtureUser } from './safety-fixtures.ts';

/** A stop flag as the device would send it: a fresh id; new pain names the knee. */
export const stopFlagOf = (
  flag: StopFlag,
  date: string,
  overrides: Partial<ReportStopFlag> = {},
): ReportStopFlag => ({
  id: crypto.randomUUID(),
  flag,
  date,
  ...(flag === StopFlag.NewPain ? { bodyArea: BodyArea.Knee } : {}),
  ...overrides,
});

/** Calls `POST /safety/stop-flags`. */
export async function postStopFlag(user: FixtureUser, entry: ReportStopFlag) {
  const response = await user.call(HttpMethod.Post, stopFlagPath(), entry);
  return {
    status: response.status,
    result: reportStopFlagResultSchema.parse(await response.json()),
  };
}

/** Calls `POST /safety/stop-flags/confirm`. */
export async function postConfirm(user: FixtureUser) {
  const response = await user.call(HttpMethod.Post, stopFlagPath(StopFlagSubpath.Confirm));
  return {
    status: response.status,
    result: confirmDoctorSeenResultSchema.parse(await response.json()),
  };
}

/** Calls `GET /safety` and returns what the stop flags add up to. */
export async function getStopState(user: FixtureUser): Promise<StopState> {
  const response = await user.call(HttpMethod.Get, ApiPath.Safety);
  if (response.status !== 200) throw new Error(`get safety failed: ${response.status}`);
  return safetyStateSchema.parse(await response.json()).stop;
}

/** Calls `POST /screening/recheck`. */
export async function postRecheck(user: FixtureUser, recheck: RecheckScreening) {
  const response = await user.call(HttpMethod.Post, ApiPath.ScreeningRecheck, recheck);
  return {
    status: response.status,
    result: saveScreeningResultSchema.parse(await response.json()),
  };
}

/** `GET /safety`'s `stop` for a person who has reported nothing. */
export const NO_STOP = { pausing: [], restOn: null, excludedAreas: [] };
