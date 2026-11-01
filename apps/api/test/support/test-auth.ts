import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { createTokenVerifier, type TokenVerifier } from '../../src/auth/index.ts';

export const TEST_ISSUER = 'https://ep-test.neonauth.example.neon.tech';
const KEY_ID = 'test-key-1';
const ALGORITHM = 'EdDSA';
const TOKEN_LIFETIME_SECONDS = 15 * 60;

export interface SignTokenOptions {
  issuer?: string;
  /** Seconds since the epoch; defaults to 15 minutes from now (what Neon Auth issues). */
  expiresAt?: number;
  /** Sign with another key than the one the verifier trusts. */
  privateKey?: CryptoKey;
  /** Replaces the `sub` claim; `null` omits it. */
  subject?: string | null;
}

export function generateEd25519KeyPair() {
  return generateKeyPair(ALGORITHM, { crv: 'Ed25519' });
}

/**
 * A local stand-in for Neon Auth's signing keys: a generated Ed25519 key whose public half is
 * served as a JWKS. The verifier under test is the real one (real jose checks); only the key
 * source differs from production, where it is `createRemoteJWKSet`.
 */
export async function createTestAuth() {
  const { publicKey, privateKey } = await generateEd25519KeyPair();
  const jwk = { ...(await exportJWK(publicKey)), kid: KEY_ID, alg: ALGORITHM };
  const verifier: TokenVerifier = createTokenVerifier({
    keys: createLocalJWKSet({ keys: [jwk] }),
    issuer: TEST_ISSUER,
  });

  /** A token like the one Better Auth's JWT plugin returns: `sub`, `email`, `role`, 15 minutes. */
  async function signToken(userId: string, options: SignTokenOptions = {}): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const jwt = new SignJWT({ email: 'person@example.com', role: 'authenticated' })
      .setProtectedHeader({ alg: ALGORITHM, kid: KEY_ID })
      .setIssuer(options.issuer ?? TEST_ISSUER)
      .setIssuedAt(issuedAt)
      .setExpirationTime(options.expiresAt ?? issuedAt + TOKEN_LIFETIME_SECONDS);
    if (options.subject !== null) jwt.setSubject(options.subject ?? userId);
    return jwt.sign(options.privateKey ?? privateKey);
  }

  return { verifier, signToken };
}
