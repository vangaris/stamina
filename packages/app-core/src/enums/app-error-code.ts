/** What `mediator.send` rejects with (`AppError.code`); the UI picks its message from this. */
export enum AppErrorCode {
  ValidationFailed = 'validation_failed',
  InvalidCode = 'invalid_code',
  CodeExpired = 'code_expired',
  TooManyAttempts = 'too_many_attempts',
  Offline = 'offline',
  Unauthorized = 'unauthorized',
  Unknown = 'unknown',
}
