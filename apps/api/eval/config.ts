import { fileURLToPath } from 'node:url';

/** Spec "Outside the seams": a prompt change must keep at least 98 % of first answers valid. */
export const PASS_RATE_THRESHOLD = 0.98;

export const SESSION_PICKS_CASES_FILE = fileURLToPath(
  new URL('./cases/session-picks.json', import.meta.url),
);

/** The model name shown in a report for the offline harness provider. */
export const HARNESS_MODEL = 'harness-first-candidates';

export const MICRO_USD_PER_USD = 1_000_000;
/** Decimal places of the cost line of a report (millionths of a dollar). */
export const REPORT_COST_DECIMALS = 6;
