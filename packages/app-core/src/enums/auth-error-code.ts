/** What an `AuthService` adapter throws (`AuthError.code`), whichever provider is behind it. */
export enum AuthErrorCode {
  InvalidCode = 'invalid_code',
  CodeExpired = 'code_expired',
  TooManyAttempts = 'too_many_attempts',
  Network = 'network',
  Unknown = 'unknown',
}
