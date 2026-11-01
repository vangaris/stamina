import type { AppErrorCode } from '../enums/app-error-code.ts';

/**
 * The only error `mediator.send` rejects with. The message is the code, never the original
 * message or cause, because those can carry the email or code the user typed.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode) {
    super(code);
    this.name = 'AppError';
    this.code = code;
  }
}
