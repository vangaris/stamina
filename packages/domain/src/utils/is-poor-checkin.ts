import { POOR_CHECKIN_ANSWERS, POOR_CHECKIN_SCORE } from '../config.ts';
import type { CheckinFact } from '../types.ts';

/** Whether at least `POOR_CHECKIN_ANSWERS` of the Check-in's sleep, soreness and energy answers are low. */
export function isPoorCheckin({ sleep, soreness, energy }: CheckinFact): boolean {
  return (
    [sleep, soreness, energy].filter((answer) => answer <= POOR_CHECKIN_SCORE).length >=
    POOR_CHECKIN_ANSWERS
  );
}
