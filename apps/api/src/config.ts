import { isEuSentryDsn } from '@stamina/safe-log';
import { z } from 'zod';
import { SentryEnvironment } from './enums/sentry-environment.ts';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
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
  SENTRY_ENVIRONMENT: z.enum(SentryEnvironment).default(SentryEnvironment.Production),
});

export interface Config {
  databaseUrl: string;
  corsOrigins: string[];
  /** Present only when `SENTRY_DSN` is set. */
  sentry?: { dsn: string; environment: SentryEnvironment };
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.parse(env);
  return {
    databaseUrl: parsed.DATABASE_URL,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    ...(parsed.SENTRY_DSN
      ? { sentry: { dsn: parsed.SENTRY_DSN, environment: parsed.SENTRY_ENVIRONMENT } }
      : {}),
  };
}
