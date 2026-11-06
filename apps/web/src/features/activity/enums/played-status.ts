/** Where "I played" stands: the sheet is being filled in, the Activity is being sent, or how it ended. */
export enum PlayedStatus {
  Idle = 'idle',
  Saving = 'saving',
  /** The server has it. */
  Saved = 'saved',
  /** On this device, waiting for a connection. */
  Queued = 'queued',
  Failed = 'failed',
}
