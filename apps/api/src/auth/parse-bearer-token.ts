import { BEARER_PREFIX } from './config.ts';

/** The token from an `Authorization: Bearer <jwt>` header value, or undefined when absent or another scheme. */
export function parseBearerToken(header: string | undefined): string | undefined {
  if (header === undefined || !header.toLowerCase().startsWith(BEARER_PREFIX)) return undefined;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token === '' ? undefined : token;
}
