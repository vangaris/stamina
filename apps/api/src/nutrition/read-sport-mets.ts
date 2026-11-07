import { SportKind } from '@stamina/contracts';
import { normalizeSportName, type Intensity } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { sport } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toCatalogSport } from '../sports/index.ts';
import type { SportRef } from './types.ts';

/**
 * The METs of a sport at each intensity, from its Sport Profile (`metsPerIntensity`), or `null`
 * when it has none the person may see: an unapproved launch sport, an "Other" sport nobody has
 * drafted, or a stored profile that no longer validates. Reads as the app role, so the sport
 * policy decides what is visible.
 */
export async function readSportMets(
  tx: UserTx,
  ref: SportRef,
): Promise<Record<Intensity, number> | null> {
  const [row] = await tx
    .select()
    .from(sport)
    .where(
      ref.kind === SportKind.Launch
        ? eq(sport.id, ref.sport)
        : eq(sport.normalizedName, normalizeSportName(ref.name)),
    );
  if (row === undefined) return null;
  return toCatalogSport(row)?.profile?.metsPerIntensity ?? null;
}
