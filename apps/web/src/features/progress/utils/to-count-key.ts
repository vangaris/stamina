import { ProgressCountWording } from '../enums/progress-count-wording.ts';

/**
 * The i18n key that words a count: `<prefix>.value` while done is within planned, `valueOver`
 * once done exceeds it, and `valueUnplanned` when nothing was planned.
 */
export function toCountKey(prefix: string, done: number, planned: number): string {
  if (planned <= 0) return `${prefix}.${ProgressCountWording.Unplanned}`;
  if (done > planned) return `${prefix}.${ProgressCountWording.Over}`;
  return `${prefix}.${ProgressCountWording.OfPlanned}`;
}
