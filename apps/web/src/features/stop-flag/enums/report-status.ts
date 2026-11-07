/** Where the report of a stop flag stands. Its outcome is shown whatever this is. */
export enum ReportStatus {
  Idle = 'idle',
  Sending = 'sending',
  /** The server has it. */
  Saved = 'saved',
  /** Kept on this phone to be sent when the signal is back. */
  Queued = 'queued',
  Failed = 'failed',
}
