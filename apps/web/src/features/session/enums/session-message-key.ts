/** i18n keys the Session composable hands to its screen; the components translate them. */
export enum SessionMessageKey {
  /** A Session that was never opened on this device cannot be opened without a connection. */
  Offline = 'session.errors.offline',
  Unknown = 'session.errors.unknown',
  /** The server refused a set; it is not kept. */
  SetRejected = 'session.errors.setRejected',
  FinishFailed = 'session.errors.finishFailed',
}
