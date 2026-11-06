/** Where the last logged set is kept; the values are the i18n keys' last part (`session.status.<value>`). */
export enum SetSaveStatus {
  /** The server has it. */
  Saved = 'saved',
  /** On this device, waiting for a connection. */
  Queued = 'queued',
  /** On this device; sending it failed for a reason other than the connection. */
  NotSent = 'not-sent',
}
