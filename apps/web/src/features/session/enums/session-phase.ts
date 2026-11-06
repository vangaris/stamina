/** What the Session screen shows: while it opens, if it cannot, then one step of the Session at a time. */
export enum SessionPhase {
  Loading = 'loading',
  Failed = 'failed',
  /** One exercise at a time: the target, the steppers and the Done button. */
  Focus = 'focus',
  /** The whole Session as a table. */
  Overview = 'overview',
  /** Asking how hard the Session was. */
  Finish = 'finish',
  /** The Session is finished: its Load. Also where a finished Session opens. */
  Done = 'done',
}
