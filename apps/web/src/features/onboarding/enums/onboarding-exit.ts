/** The ways a person leaves the onboarding screens; the container maps each to a route. */
export enum OnboardingExit {
  /** Not signed in (or the session ended): back to the start. */
  SignedOut = 'signed-out',
  /** Already has a profile: nothing to ask. */
  ProfileExists = 'profile-exists',
  /** No remembered invite code: enter one first. */
  InviteNeeded = 'invite-needed',
  /** The server did not accept the invite code when saving. */
  InviteRejected = 'invite-rejected',
  /** The profile is saved. */
  Finished = 'finished',
}
