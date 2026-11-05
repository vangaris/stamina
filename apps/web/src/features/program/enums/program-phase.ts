/** What a Program screen shows: while it asks, once it has the week, when none can be made, or after a failure. */
export enum ProgramPhase {
  Loading = 'loading',
  Ready = 'ready',
  /** The server refused or there is no Program yet; the screen explains and offers a way on. */
  Unavailable = 'unavailable',
  Failed = 'failed',
}
