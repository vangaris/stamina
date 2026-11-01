/** Digits in the emailed one-time code (the Neon Auth Email OTP default). */
export const CODE_LENGTH = 6;

/** Seconds before "send a new code" is offered again. */
export const RESEND_COOLDOWN_SECONDS = 30;

export const COOLDOWN_TICK_MS = 1000;

/** Browser autofill hints: the email suggestion, and the one-time code from the mail or SMS app. */
export const EMAIL_AUTOCOMPLETE = 'email';
export const CODE_AUTOCOMPLETE = 'one-time-code';
