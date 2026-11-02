/** Why "a doctor has said I can train" was not recorded. */
export enum DoctorOkRejection {
  /** No Screening, or the latest one is not a referral. */
  NotReferred = 'not-referred',
  /** Pregnancy has no Limited path. */
  Pregnancy = 'pregnancy',
}
