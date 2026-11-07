/** How the week is going against the person's own usual, in one phrase (Progress). */
export enum VerdictKind {
  /** No earlier week has data yet, so there is no usual to compare with. */
  NotEnoughHistory = 'not-enough-history',
  /** The week's Load, with what is still planned, lands within the usual range. */
  OnTrack = 'on-track',
  /** The week is heading above the usual range. */
  AboveUsual = 'above-usual',
  /** The week is heading below the usual range. */
  BelowUsual = 'below-usual',
  /** A Session that was due earlier this week is not done. */
  SessionsBehind = 'sessions-behind',
}
