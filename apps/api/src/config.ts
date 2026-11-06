import { isEuSentryDsn } from '@stamina/safe-log';
import { z } from 'zod';
import { isValidFieldKey } from './crypto/index.ts';
import { SentryEnvironment } from './enums/sentry-environment.ts';

const JWKS_PATH = '/.well-known/jwks.json';

/** Any http(s) URL, including `localhost` and IP hosts (local dev and the e2e fake auth server); never throws. */
const isHttpUrl = (value: string) =>
  URL.canParse(value) && /^https?:$/.test(new URL(value).protocol);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Neon Auth `base_url` (it ends with `/auth`): its JWKS and token issuer are derived from it. */
  NEON_AUTH_BASE_URL: z.string().refine(isHttpUrl, 'NEON_AUTH_BASE_URL must be an http(s) URL'),
  /**
   * Secret. Base64 of exactly 32 random bytes (`openssl rand -base64 32`): the AES-256-GCM key
   * that encrypts Screening answers. Each environment has its own; a bad value fails fast.
   */
  SCREENING_ENCRYPTION_KEY: z
    .string()
    .refine(isValidFieldKey, 'SCREENING_ENCRYPTION_KEY must be base64 of exactly 32 bytes'),
  /** Comma-separated web origins allowed to call the API; `https://*.example.pages.dev` matches subdomains. */
  CORS_ORIGINS: z.string().default(''),
  /** Sentry EU DSN. Unset or empty disables error reporting. */
  SENTRY_DSN: z
    .string()
    .trim()
    .refine(
      (dsn) => dsn === '' || isEuSentryDsn(dsn),
      'SENTRY_DSN must be an https DSN on *.de.sentry.io',
    )
    .optional(),
  /**
   * Secret. The Anthropic API key. Unset or empty keeps the "unavailable" AI provider: Sessions
   * are picked by the rules. Setting it is the launch switch for AI (Phase B).
   */
  ANTHROPIC_API_KEY: z.string().trim().optional(),
  SENTRY_ENVIRONMENT: z.enum(SentryEnvironment).default(SentryEnvironment.Production),
});

export interface NeonAuthConfig {
  /** `<base>/.well-known/jwks.json`: the public keys the API verifies sign-in tokens with. */
  jwksUrl: string;
  /** The origin of the base URL; every token's `iss` must equal it. */
  issuer: string;
}

export interface Config {
  databaseUrl: string;
  corsOrigins: string[];
  /** Base64 of the 32-byte Screening encryption key. Never logged. */
  screeningEncryptionKey: string;
  neonAuth: NeonAuthConfig;
  /** Present only when `ANTHROPIC_API_KEY` is set. */
  anthropicApiKey?: string;
  /** Present only when `SENTRY_DSN` is set. */
  sentry?: { dsn: string; environment: SentryEnvironment };
}

function neonAuthConfig(baseUrl: string): NeonAuthConfig {
  const base = new URL(baseUrl);
  return {
    jwksUrl: `${base.origin}${base.pathname.replace(/\/+$/, '')}${JWKS_PATH}`,
    issuer: base.origin,
  };
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.parse(env);
  return {
    databaseUrl: parsed.DATABASE_URL,
    screeningEncryptionKey: parsed.SCREENING_ENCRYPTION_KEY,
    neonAuth: neonAuthConfig(parsed.NEON_AUTH_BASE_URL),
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    ...(parsed.ANTHROPIC_API_KEY ? { anthropicApiKey: parsed.ANTHROPIC_API_KEY } : {}),
    ...(parsed.SENTRY_DSN
      ? { sentry: { dsn: parsed.SENTRY_DSN, environment: parsed.SENTRY_ENVIRONMENT } }
      : {}),
  };
}
