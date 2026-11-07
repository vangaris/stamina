/** What the Today timeline shows: while the day is asked for, once it is known, or when nothing could be read. */
export enum TodayStatus {
  Loading = 'loading',
  Ready = 'ready',
  /** Neither the Program nor the week's Load could be read (no signal and nothing stored). */
  Failed = 'failed',
}
