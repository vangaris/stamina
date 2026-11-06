/** A Session's Load: the session RPE times the minutes it took. */
export function sessionLoad(rpe: number, minutes: number): number {
  return rpe * minutes;
}
