/** `code` values in Better Auth's `{ code, message }` error bodies that the app distinguishes. */
export enum BetterAuthErrorCode {
  InvalidOtp = 'INVALID_OTP',
  OtpExpired = 'OTP_EXPIRED',
  TooManyAttempts = 'TOO_MANY_ATTEMPTS',
}
