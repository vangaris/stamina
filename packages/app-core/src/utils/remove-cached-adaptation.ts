import type { PlanCache } from '../types.ts';

/** Takes the card for this Adaptation out of the cached pending list (nothing when no list is cached). */
export async function removeCachedAdaptation(
  planCache: PlanCache,
  adaptationId: string,
): Promise<void> {
  const cached = await planCache.readAdaptations();
  if (cached) await planCache.saveAdaptations(cached.filter(({ id }) => id !== adaptationId));
}
