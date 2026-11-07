/** Where a signed-in person stands before training: what must happen next, or that nothing must. */
export enum SafetyStatus {
  /** Onboarding is not finished: no profile is saved, so no health question may be asked yet. */
  ProfileNeeded = 'profile_needed',
  /** The disclaimer or the health-data consent is not given at the current text version. */
  ConsentNeeded = 'consent_needed',
  /** Both consents are given and there is no Screening yet. */
  ScreeningNeeded = 'screening_needed',
  /** The latest Screening refers the person to a professional and no doctor statement lifts it. */
  Referred = 'referred',
  /** Cleared to train, but a reported stop flag pauses training until the person confirms a doctor has seen or cleared them. */
  Paused = 'paused',
  /** Cleared, or Referred with the doctor statement (Limited mode): the app can be used. */
  Ready = 'ready',
}
