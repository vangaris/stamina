/** Where the signed-in user stands with onboarding. */
export enum ProfileStatus {
  Unknown = 'unknown',
  /** The profile is saved: onboarding is finished. */
  Present = 'present',
  /** No profile yet, and a checked invite code is remembered: the person can answer the screens. */
  NotStarted = 'not_started',
  /** No profile and no remembered invite code: the person has to enter one first. */
  InviteNeeded = 'invite_needed',
}
