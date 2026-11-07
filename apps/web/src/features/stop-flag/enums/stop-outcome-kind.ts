/** What a reported stop flag means for the person, in the words they read. The value is its i18n key part. */
export enum StopOutcomeKind {
  /** Training is paused until the person confirms a doctor has seen them. */
  PausedDoctor = 'paused-doctor',
  /** No training today. */
  Rest = 'rest',
  /** A body area is left out of the training from now on. */
  AreaExcluded = 'area-excluded',
  /** Training is paused until the person confirms a doctor has cleared them. */
  PausedCleared = 'paused-cleared',
}
