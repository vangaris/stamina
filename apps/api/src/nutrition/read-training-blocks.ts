import { SportKind } from '@stamina/contracts';
import {
  FALLBACK_METS_PER_INTENSITY,
  Intensity,
  SESSION_MET,
  TrainingKind,
  plannedActivities,
  weekStartOf,
  type TrainingBlock,
} from '@stamina/domain';
import { and, eq } from 'drizzle-orm';
import { readLoadAnchor } from '../activities/index.ts';
import { activity } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { readPlannedSessions } from '../progress/index.ts';
import { readSportMets } from './read-sport-mets.ts';
import type { NutritionProfileRow, SportRef } from './types.ts';

/**
 * Everything the person trains on `date`, as the targets see it: each current Session dated that
 * day (every one counts `SESSION_MET`, as Sessions carry no intensity), each Activity logged that
 * day, and the day's planned Activity from the profile's play pattern while none is logged for
 * it (nothing when the sport varies). An Activity's METs come from its own sport's Sport Profile
 * at its intensity, else from `FALLBACK_METS_PER_INTENSITY`.
 */
export async function readTrainingBlocks(
  tx: UserTx,
  userId: string,
  own: NutritionProfileRow,
  date: string,
  today: string,
): Promise<TrainingBlock[]> {
  const metsBySport = new Map<string, Record<Intensity, number>>();
  const metsFor = async (ref: SportRef, intensity: Intensity): Promise<number> => {
    const key = ref.kind === SportKind.Launch ? `launch:${ref.sport}` : `other:${ref.name}`;
    if (!metsBySport.has(key)) {
      metsBySport.set(key, (await readSportMets(tx, ref)) ?? FALLBACK_METS_PER_INTENSITY);
    }
    return metsBySport.get(key)![intensity];
  };

  const blocks: TrainingBlock[] = (await readPlannedSessions(tx, userId))
    .filter((planned) => planned.date === date)
    .map(({ minutes }) => ({
      kind: TrainingKind.Session,
      minutes,
      mets: SESSION_MET,
      hot: false,
      hard: false,
    }));

  const logged = await tx
    .select()
    .from(activity)
    .where(and(eq(activity.userId, userId), eq(activity.date, date)));
  for (const row of logged) {
    const ref: SportRef =
      row.sportKind === SportKind.Launch
        ? { kind: SportKind.Launch, sport: row.launchSport! }
        : { kind: SportKind.Other, name: row.otherSportName! };
    blocks.push({
      kind: TrainingKind.Activity,
      minutes: row.minutes,
      mets: await metsFor(ref, row.intensity),
      hot: row.hot,
      hard: row.intensity === Intensity.Hard,
    });
  }

  const anchor = await readLoadAnchor(tx, userId, today);
  const planned = plannedActivities(weekStartOf(anchor, date), own, anchor).find(
    (day) => day.date === date,
  );
  const plannedIsLogged = logged.some((row) => row.planned);
  if (planned !== undefined && !plannedIsLogged) {
    const ref: SportRef =
      own.sportKind === SportKind.Launch
        ? { kind: SportKind.Launch, sport: own.launchSport! }
        : { kind: SportKind.Other, name: own.otherSportName! };
    blocks.push({
      kind: TrainingKind.Activity,
      minutes: planned.minutes,
      mets: await metsFor(ref, planned.intensity),
      hot: own.hotConditionsDefault,
      hard: planned.intensity === Intensity.Hard,
    });
  }
  return blocks;
}
