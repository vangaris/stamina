/** What a person may do with training right now, derived from Screening and the doctor statement. */
export enum TrainingMode {
  Full = 'full',
  /** Referred, then stated "a doctor has said I can train": effort capped, no explosive work. */
  Limited = 'limited',
  /** Referred and not (or not able to be) released: no Program. */
  Referred = 'referred',
}
