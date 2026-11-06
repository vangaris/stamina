import { PASS_RATE_THRESHOLD } from './config.ts';
import { passRate } from './pass-rate.ts';
import type { EvalReport } from './types.ts';

/** Whether the report meets the bar. A harness report never fails: it measures no model. */
export function meetsThreshold(report: EvalReport): boolean {
  return !report.measuresModel || passRate(report.results) >= PASS_RATE_THRESHOLD;
}
