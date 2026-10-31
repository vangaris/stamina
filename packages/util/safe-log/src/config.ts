/**
 * Error reports keep what is needed to find a bug (exception type, stack frames) and drop
 * everything else. The event is rebuilt from these allowlists, so a field the SDK adds later is
 * dropped until someone allows it here.
 */
export const EVENT_FIELDS = [
  'event_id',
  'timestamp',
  'platform',
  'level',
  'release',
  'environment',
  'sdk',
];
export const TAG_FIELDS = ['request_id'];
export const FRAME_FIELDS = ['function', 'module', 'lineno', 'colno', 'in_app'];
/** Frame fields that hold a URL or path; their query string and fragment are stripped. */
export const URL_FRAME_FIELDS = ['filename', 'abs_path'];
export const MECHANISM_FIELDS = ['type', 'handled', 'synthetic'];
export const MAX_TYPE_LENGTH = 100;

/** Health data must stay in the EU, so only the Sentry EU region (`*.de.sentry.io`) is accepted. */
export const EU_SENTRY_HOST_SUFFIX = '.de.sentry.io';

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
