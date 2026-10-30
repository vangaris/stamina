import { FAKE_AUTH } from '../config.ts';
import { AuthErrorCode } from '../enums/auth-error-code.ts';
import { AuthError } from '../errors/auth-error.ts';
import type { AuthService, AuthSession } from '../types.ts';

/**
 * In-memory stand-in for Neon Auth (Test and Dev modes). Any email signs in with the code
 * `FAKE_AUTH.validCode`; `FAKE_AUTH.maxWrongCodes` wrong codes lock that email until a new code
 * is requested. It throws the same `AuthError`s the real adapter does.
 */
export function createFakeAuthService(): AuthService {
  const userIds = new Map<string, string>();
  const wrongCodes = new Map<string, number>();
  let session: AuthSession | undefined;

  return {
    async requestEmailCode(email) {
      wrongCodes.delete(email);
    },
    async verifyEmailCode(email, code) {
      const wrong = wrongCodes.get(email) ?? 0;
      if (wrong >= FAKE_AUTH.maxWrongCodes) throw new AuthError(AuthErrorCode.TooManyAttempts);
      if (code !== FAKE_AUTH.validCode) {
        wrongCodes.set(email, wrong + 1);
        throw new AuthError(
          wrong + 1 >= FAKE_AUTH.maxWrongCodes
            ? AuthErrorCode.TooManyAttempts
            : AuthErrorCode.InvalidCode,
        );
      }
      wrongCodes.delete(email);
      const userId = userIds.get(email) ?? crypto.randomUUID();
      userIds.set(email, userId);
      session = { userId };
    },
    async startGoogleSignIn(callbackUrl) {
      return { redirectUrl: callbackUrl };
    },
    async getToken() {
      return session && `${FAKE_AUTH.tokenPrefix}${session.userId}`;
    },
    async getSession() {
      return session;
    },
    async signOut() {
      session = undefined;
    },
  };
}
