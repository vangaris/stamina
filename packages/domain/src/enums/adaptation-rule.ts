/**
 * The rule that raised an Adaptation. Its id picks the reason template (EN and EL), so a stored
 * Adaptation always explains itself with the numbers it was raised on.
 */
export enum AdaptationRule {
  /** An unplanned hard Activity inside the recovery window before the next heavy Session. */
  UnplannedActivity = 'unplanned-activity',
  /** A Check-in with 2 of its 3 answers at 2 or below. */
  PoorCheckin = 'poor-checkin',
  /** Soreness at 2 or below while today's Session loads a targeted area. */
  SoreArea = 'sore-area',
  /** Load above 1.3 times the person's average for two weeks running. */
  DeloadLoad = 'deload-load',
  /** Three poor Check-ins in five days. */
  DeloadCheckins = 'deload-checkins',
  /** Two Sessions in a row at the target effort plus 2 or more. */
  DeloadEffort = 'deload-effort',
  /** Two or more Sessions of the week missed. */
  RepeatWeek = 'repeat-week',
  /** Two or more weeks without a Session. */
  RestartBlock = 'restart-block',
}
