import { EU_SENTRY_HOST_SUFFIX } from '../config.ts';

/** Health data must stay in the EU, so only the Sentry EU region (`*.de.sentry.io`) is accepted. */
export function isEuSentryDsn(dsn: string): boolean {
  try {
    const url = new URL(dsn);
    return url.protocol === 'https:' && url.hostname.endsWith(EU_SENTRY_HOST_SUFFIX);
  } catch {
    return false;
  }
}
