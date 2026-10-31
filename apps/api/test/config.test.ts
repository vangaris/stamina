import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

const BASE = {
  DATABASE_URL: 'postgres://u:p@127.0.0.1:5432/db',
  NEON_AUTH_BASE_URL: 'https://ep-x.neonauth.eu-central-1.aws.neon.tech/neondb/auth',
};

describe('loadConfig: Neon Auth', () => {
  it('derives the JWKS URL and the issuer from the base URL', () => {
    expect(loadConfig(BASE).neonAuth).toEqual({
      jwksUrl: 'https://ep-x.neonauth.eu-central-1.aws.neon.tech/neondb/auth/.well-known/jwks.json',
      issuer: 'https://ep-x.neonauth.eu-central-1.aws.neon.tech',
    });
  });

  it('ignores a trailing slash on the base URL', () => {
    const config = loadConfig({ ...BASE, NEON_AUTH_BASE_URL: `${BASE.NEON_AUTH_BASE_URL}/` });

    expect(config.neonAuth.jwksUrl).toBe(
      'https://ep-x.neonauth.eu-central-1.aws.neon.tech/neondb/auth/.well-known/jwks.json',
    );
  });

  it('is required and must be an http(s) URL', () => {
    expect(() => loadConfig({ DATABASE_URL: BASE.DATABASE_URL })).toThrow();
    expect(() => loadConfig({ ...BASE, NEON_AUTH_BASE_URL: 'not a url' })).toThrow();
    expect(() => loadConfig({ ...BASE, NEON_AUTH_BASE_URL: 'ftp://host/auth' })).toThrow();
  });
});
