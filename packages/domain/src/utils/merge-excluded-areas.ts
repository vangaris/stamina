import type { BodyArea } from '../enums/body-area.ts';
import type { StopState } from '../types.ts';

/** The areas Screening excluded plus the areas of reported new pain, each once, Screening's first. */
export function mergeExcludedAreas(
  screeningAreas: readonly BodyArea[],
  { excludedAreas }: Pick<StopState, 'excludedAreas'>,
): BodyArea[] {
  return [...new Set([...screeningAreas, ...excludedAreas])];
}
