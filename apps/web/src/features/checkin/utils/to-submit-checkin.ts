import type { SubmitCheckin } from '@stamina/contracts';
import type { CheckinDraft } from '../types.ts';

/** The Check-in to send: every question answered, or nothing while one is still open. */
export function toSubmitCheckin(
  id: string,
  date: string,
  draft: CheckinDraft,
): SubmitCheckin | undefined {
  const { sleep, soreness, energy } = draft;
  if (sleep === undefined || soreness === undefined || energy === undefined) return undefined;
  return { id, date, sleep, soreness, energy };
}
