/** Why a Screening was not stored. */
export enum ScreeningRejection {
  /** The disclaimer or the health-data consent has not been given: no health question is accepted. */
  ConsentMissing = 'consent-missing',
}
