/** Where the weigh-in stands: nothing sent, being sent, or how it ended. */
export enum WeighInStatus {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Failed = 'failed',
}
