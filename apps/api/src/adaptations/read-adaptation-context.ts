import {
  ADAPTATION_LOOKBACK_DAYS,
  DAYS_IN_WEEK,
  addDays,
  type AdaptationContext,
} from '@stamina/domain';
import { and, eq, gte } from 'drizzle-orm';
import { readLoadAnchor, readLoadEntries } from '../activities/index.ts';
import { checkin } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { ProgramInputsStatus, readCurrentWeek, readProgramInputs } from '../program/index.ts';
import { readAdaptationHistory } from './read-adaptation-history.ts';
import { readAdaptationSessions } from './read-adaptation-sessions.ts';
import { readFinishedFacts } from './read-finished-facts.ts';
import { toGenerationBasis } from './to-generation-basis.ts';

/**
 * Everything the Adaptation rules read for the user at `now` (UTC day), or `null` when there is
 * nothing to adapt: no Program yet, or the engine cannot run for the person right now (no
 * consent, a Referred mode, a pausing stop flag not yet confirmed). Reads as the app role, so
 * what the rules see is what the person may see. The generation basis is the person's profile,
 * Sport Profile, Screening and stop flags as they are now, so a regenerated week avoids a newly
 * reported area. The call is not locked; a writer holds `lockUser` first.
 */
export async function readAdaptationContext(
  tx: UserTx,
  userId: string,
  now: Date,
): Promise<AdaptationContext | null> {
  const week = await readCurrentWeek(tx, userId);
  if (week === null) return null;
  const inputs = await readProgramInputs(tx, userId, now);
  if (inputs.status === ProgramInputsStatus.Refused) return null;

  const today = now.toISOString().slice(0, 10);
  const since = addDays(today, -ADAPTATION_LOOKBACK_DAYS);
  const weekInBlock = week.sessions[0]!.weekInBlock;
  const { sessionEntries, activityRows } = await readLoadEntries(tx, userId);
  const checkinRows = await tx
    .select()
    .from(checkin)
    .where(and(eq(checkin.userId, userId), gte(checkin.date, since)));

  return {
    today,
    now: now.toISOString(),
    weekStartsOn: addDays(week.block.startsOn, (weekInBlock - 1) * DAYS_IN_WEEK),
    weekInBlock,
    programStartsOn: await readLoadAnchor(tx, userId, today),
    sessions: await readAdaptationSessions(tx, week.sessions),
    finished: await readFinishedFacts(tx, userId),
    activities: activityRows
      .filter(({ date }) => date >= since)
      .map(({ id, date, intensity, minutes, load, planned }) => ({
        id,
        date,
        intensity,
        minutes,
        load,
        planned,
      })),
    checkins: checkinRows.map(({ id, date, sleep, soreness, energy }) => ({
      id,
      date,
      sleep,
      soreness,
      energy,
    })),
    loadEntries: [...sessionEntries, ...activityRows],
    generation: toGenerationBasis(inputs.input),
    history: await readAdaptationHistory(tx, userId),
  };
}
