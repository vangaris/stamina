import type { JWTVerifyGetKey } from 'jose';

export interface TokenVerifierOptions {
  /** Where signing keys come from: `createRemoteJWKSet` in production, a local JWKS in tests. */
  keys: JWTVerifyGetKey;
  /** The `iss` every token must carry (the origin of `NEON_AUTH_BASE_URL`). */
  issuer: string;
}

/** `ok: false` for every token fault: malformed, wrong key, wrong issuer, expired, no valid `sub`. */
export type VerifyResult = { ok: true; userId: string } | { ok: false };

export interface TokenVerifier {
  /**
   * Checks signature, issuer, expiry and that `sub` is a UUID. A bad token is a result, not an
   * exception; only a broken key source (JWKS unreachable) throws `KeySourceUnavailableError`,
   * because that is a server fault, not an unauthorized caller.
   */
  verify(token: string): Promise<VerifyResult>;
}
