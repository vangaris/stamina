/** What `mediator.send` rejects with (`AppError.code`); the UI picks its message from this. */
export enum AppErrorCode {
  ValidationFailed = 'validation_failed',
  InvalidCode = 'invalid_code',
  CodeExpired = 'code_expired',
  TooManyAttempts = 'too_many_attempts',
  Offline = 'offline',
  Unauthorized = 'unauthorized',
  /** Sign-out refused: Session logs still wait to be sent, and signing out would wipe them. */
  UnsyncedData = 'unsynced_data',
  Unknown = 'unknown',
}
