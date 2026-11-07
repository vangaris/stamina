/** Why a Screening was not stored. */
export enum ScreeningRejection {
  /** The disclaimer or the health-data consent has not been given: no health question is accepted. */
  ConsentMissing = 'consent-missing',
  /** No saved profile: under-18s and non-EEA residents are stopped at onboarding and never reach a health question. */
  ProfileMissing = 'profile-missing',
  /** Nothing to carry the other answers over from: the first Screening takes all ten questions. */
  NoScreening = 'no-screening',
}
