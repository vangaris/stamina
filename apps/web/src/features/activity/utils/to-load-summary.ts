import type { WeekLoad } from '@stamina/contracts';
import type { LoadSummaryView } from '../types.ts';

/** What the week's Load summary shows: this week's Load and the person's own average, once there is one. */
export function toLoadSummary({
  load,
  average,
}: Pick<WeekLoad, 'load' | 'average'>): LoadSummaryView {
  return { load, average };
}
