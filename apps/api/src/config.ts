import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Comma-separated web origins allowed to call the API; `https://*.example.pages.dev` matches subdomains. */
  CORS_ORIGINS: z.string().default(''),
});

export interface Config {
  databaseUrl: string;
  corsOrigins: string[];
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.parse(env);
  return {
    databaseUrl: parsed.DATABASE_URL,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
