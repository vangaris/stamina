import { errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import { ACCEPTED_JWT_ALGORITHMS, REQUIRED_JWT_CLAIMS } from './config.ts';
import { KeySourceUnavailableError } from './key-source-unavailable-error.ts';
import type { TokenVerifier, TokenVerifierOptions } from './types.ts';

const subjectSchema = z.guid();

/** A key lookup that fails for a reason other than "this token names no known key" is an outage. */
function guardKeySource(keys: JWTVerifyGetKey): JWTVerifyGetKey {
  return async (header, token) => {
    try {
      return await keys(header, token);
    } catch (error) {
      if (
        error instanceof errors.JWKSNoMatchingKey ||
        error instanceof errors.JWKSMultipleMatchingKeys
      ) {
        throw error;
      }
      throw new KeySourceUnavailableError(error);
    }
  };
}

/**
 * Verifies the short-lived JWT the browser gets from Neon Auth. Verification is real jose in
 * every environment: tests only swap the key source (a local JWKS from a generated Ed25519 key).
 */
export function createTokenVerifier({ keys, issuer }: TokenVerifierOptions): TokenVerifier {
  const guarded = guardKeySource(keys);
  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, guarded, {
          issuer,
          algorithms: ACCEPTED_JWT_ALGORITHMS,
          requiredClaims: REQUIRED_JWT_CLAIMS,
        });
        const subject = subjectSchema.safeParse(payload.sub);
        return subject.success ? { ok: true, userId: subject.data.toLowerCase() } : { ok: false };
      } catch (error) {
        if (error instanceof KeySourceUnavailableError) throw error;
        return { ok: false };
      }
    },
  };
}
