import {
  catalogSportSchema,
  sportProfileSchema,
  sportSourcesSchema,
  type CatalogSport,
} from '@stamina/contracts';
import { SportStatus } from '@stamina/domain';
import type { SportRow } from './types.ts';

/**
 * A database row in the contract shape, or `null` when its JSON no longer validates (the founder
 * edited it by hand into something the engine could not plan around). The caller leaves such a
 * row out and says which one: the id only, never the content.
 */
export function toCatalogSport(row: SportRow): CatalogSport | null {
  const profile = row.profile === null ? null : sportProfileSchema.safeParse(row.profile);
  const sources = row.sources === null ? null : sportSourcesSchema.safeParse(row.sources);
  if (profile?.success === false || sources?.success === false) return null;

  const parsed = catalogSportSchema.safeParse({
    id: row.id,
    name: row.name,
    status: row.status,
    beta: row.status !== SportStatus.Approved,
    profile: profile?.data ?? null,
    sources: sources?.data ?? null,
    version: row.version,
  });
  return parsed.success ? parsed.data : null;
}
