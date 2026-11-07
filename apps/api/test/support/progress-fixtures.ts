import {
  ApiPath,
  HttpMethod,
  logWeighInResultSchema,
  progressSchema,
  type LogWeighIn,
  type Progress,
} from '@stamina/contracts';
import { weighIn } from '../../src/db/schema.ts';
import type { FixtureUser, TestApi } from './safety-fixtures.ts';

/** Calls `GET /progress`. */
export async function getProgress(user: FixtureUser): Promise<Progress> {
  const response = await user.call(HttpMethod.Get, ApiPath.Progress);
  if (response.status !== 200) throw new Error(`get progress failed: ${response.status}`);
  return progressSchema.parse(await response.json());
}

/** Calls `POST /weigh-ins`; the result is parsed only when the answer is `200`. */
export async function postWeighIn(user: FixtureUser, entry: LogWeighIn) {
  const response = await user.call(HttpMethod.Post, ApiPath.WeighIns, entry);
  return {
    status: response.status,
    result: response.status === 200 ? logWeighInResultSchema.parse(await response.json()) : null,
  };
}

/** Inserts, as the table owner, a weigh-in on any day (the API takes none more than a day ahead). */
export async function insertWeighIn(
  api: TestApi,
  user: FixtureUser,
  date: string,
  weightKg: number,
): Promise<void> {
  await api.db.insert(weighIn).values({ userId: user.userId, date, weightKg });
}
