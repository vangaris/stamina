import { SportKind, type SavedProfile } from '@stamina/contracts';
import { normalizeSportName, type SportDemands } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { sport } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toCatalogSport } from '../sports/index.ts';

/**
 * The Sport Profile the engine plans around, or `null` for generic demands: the person's launch
 * sport while it is approved, or the sport they asked for under "Other" once it has a profile
 * (drafted ones too: such a Program is labelled beta). Reads as the app role, so the sport
 * policy decides what is visible: an unapproved launch sport is not, and gives `null`.
 */
export async function findProfileSport(
  tx: UserTx,
  { sport: answer }: SavedProfile,
): Promise<SportDemands | null> {
  const [row] = await tx
    .select()
    .from(sport)
    .where(
      answer.kind === SportKind.Launch
        ? eq(sport.id, answer.sport)
        : eq(sport.normalizedName, normalizeSportName(answer.name)),
    );
  if (row === undefined) return null;
  const catalogSport = toCatalogSport(row);
  if (catalogSport === null)
    console.error(`sport ${row.id} not used: its stored profile is not valid`);
  return catalogSport?.profile ?? null;
}
