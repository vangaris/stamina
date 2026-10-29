/** Stand-ins for health data. If one of these shows up in a log or an error report, the test fails. */
export const SENTINELS = {
  body: 'SENTINEL-BODY-knee-injury-since-march',
  query: 'SENTINEL-QUERY-resting-hr-48',
  header: 'SENTINEL-HEADER-diabetes-type-2',
  param: 'SENTINEL-PARAM-pregnant-week-20',
  error: 'SENTINEL-ERROR-eating-disorder-history',
  path: 'SENTINEL-PATH-asthma-attack',
  cookie: 'SENTINEL-COOKIE-bmi-31',
  requestId: 'SENTINEL-REQID-migraine',
} as const;

export const SENTINEL_VALUES = Object.values(SENTINELS);

/** Fails with the offending sentinel in the message, so a leak is obvious in test output. */
export function expectNoSentinel(output: unknown): void {
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  for (const sentinel of SENTINEL_VALUES) {
    if (text.includes(sentinel)) throw new Error(`leaked ${sentinel} into: ${text.slice(0, 500)}`);
  }
}
