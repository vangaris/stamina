/** Where saving the Unlock Meals setup stands: nothing sent, being sent, or it failed. */
export enum UnlockStatus {
  Idle = 'idle',
  Saving = 'saving',
  Failed = 'failed',
}
