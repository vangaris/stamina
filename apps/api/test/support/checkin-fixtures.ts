import {
  CheckinSubpath,
  HttpMethod,
  checkinPath,
  latestCheckinResponseSchema,
  submitCheckinResultSchema,
  type Checkin,
  type SubmitCheckin,
} from '@stamina/contracts';
import type { FixtureUser } from './safety-fixtures.ts';

/** A Check-in as the device would send it: a fresh id, sleep 4, soreness 2, energy 3. */
export const checkinOf = (date: string, overrides: Partial<SubmitCheckin> = {}): SubmitCheckin => ({
  id: crypto.randomUUID(),
  date,
  sleep: 4,
  soreness: 2,
  energy: 3,
  ...overrides,
});

/** Calls `POST /checkins`. */
export async function postCheckin(user: FixtureUser, entry: SubmitCheckin) {
  const response = await user.call(HttpMethod.Post, checkinPath(), entry);
  return {
    status: response.status,
    result: submitCheckinResultSchema.parse(await response.json()),
  };
}

/** Calls `GET /checkins/latest`. */
export async function getLatestCheckin(user: FixtureUser): Promise<Checkin | null> {
  const response = await user.call(HttpMethod.Get, checkinPath(CheckinSubpath.Latest));
  if (response.status !== 200) throw new Error(`get latest check-in failed: ${response.status}`);
  return latestCheckinResponseSchema.parse(await response.json()).checkin;
}
