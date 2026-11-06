/** The steps of the stop-flag sheet, in the order a person meets them. */
export enum StopFlagStep {
  /** The seven options of "Anything unusual today?". */
  Options = 'options',
  /** Which body area new pain is in. */
  Area = 'area',
  /** What the report does, shown at once from the device's rules. */
  Outcome = 'outcome',
  /** The Screening questions the report asks again. */
  Recheck = 'recheck',
}
