/**
 * Sentry collects request data, headers, cookies, user info and local variables unless told not to.
 * Spread this into the SDK's `dataCollection` option so every category is off. Structurally typed
 * so this package carries no Sentry dependency.
 */
export const noDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [] as never[],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  frameContextLines: 0,
} as const;

/** Health data must stay in the EU, so only the Sentry EU region (`*.de.sentry.io`) is accepted. */
export function isEuSentryDsn(dsn: string): boolean {
  try {
    const url = new URL(dsn);
    return url.protocol === 'https:' && url.hostname.endsWith('.de.sentry.io');
  } catch {
    return false;
  }
}
