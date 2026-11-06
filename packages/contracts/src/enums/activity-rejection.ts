/** Why an Activity was not recorded. Nothing is stored for any of these. */
export enum ActivityRejection {
  /** The date is further ahead than a device clock or time zone can explain. */
  DateOutOfRange = 'date-out-of-range',
}
