/** Where the Check-in card stands. */
export enum CheckinStatus {
  /** Finding out whether today's Check-in is in. */
  Loading = 'loading',
  /** The questions are being answered. */
  Asking = 'asking',
  /** The third answer is being sent. */
  Sending = 'sending',
  /** The send failed; the answers are kept for another try. */
  Failed = 'failed',
  /** The server has it. */
  Saved = 'saved',
  /** On this device, waiting for a connection. */
  Queued = 'queued',
  /** Today's Check-in was already in when the card loaded. */
  Answered = 'answered',
}
