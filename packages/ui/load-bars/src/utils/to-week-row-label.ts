import type { LoadBarsWeek } from '../types.ts';

/** The row heading in the text alternative: the week's label, followed by `currentLabel` for the current week. */
export function toWeekRowLabel(week: LoadBarsWeek, currentLabel: string): string {
  return week.current ? `${week.label} (${currentLabel})` : week.label;
}
