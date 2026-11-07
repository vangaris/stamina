/** Why a decision on an Adaptation was not recorded. Nothing is stored for any of these. */
export enum AdaptationRejection {
  /**
   * The Program moved on since the suggestion was shown: a Session it applies to has a newer
   * revision, was started or finished. The result carries the latest week to show instead.
   */
  Stale = 'stale',
  /** The suggestion was decided the other way already (accepted, then declined, or the reverse). */
  AlreadyDecided = 'already-decided',
}
