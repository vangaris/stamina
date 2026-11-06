/** Why an Activity was not recorded. Nothing is stored for any of these. */
export enum ActivityRejection {
  /** The date is in the future or further back than an Activity may be logged. */
  DateOutOfRange = 'date-out-of-range',
}
