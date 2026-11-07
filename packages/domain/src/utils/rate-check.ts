import {
  DAYS_IN_WEEK,
  RATE_CHECK_INTERVALS_TO_HALVE,
  RATE_CHECK_INTERVALS_TO_PROMPT,
  RATE_CHECK_LOSS_PCT,
  RATE_CHECK_MAX_INTERVAL_DAYS,
  RATE_CHECK_MIN_INTERVAL_DAYS,
} from '../config.ts';
import type { RateCheckResult, WeeklyWeight } from '../types.ts';
import { daysBetween } from './days-between.ts';

/**
 * Weight loss faster than `RATE_CHECK_LOSS_PCT` a week. `weeklyWeights` is oldest first, one
 * entry per program-anchored week (the weigh-in's own date and weight); an interval is two
 * adjacent entries, and its loss is normalised to a weekly rate over the actual days between the
 * two weigh-ins (loss % / days x 7), so a Thursday-to-Friday pair is not read as a week. An
 * interval shorter than `RATE_CHECK_MIN_INTERVAL_DAYS` or longer than
 * `RATE_CHECK_MAX_INTERVAL_DAYS` is ignored and breaks the run. The deficit halves after the
 * last two intervals both lose too fast; the prompt to talk to a dietitian or doctor shows when
 * the last three do (the check firing at two consecutive weekly evaluations). [INFERENCE] on the
 * 'twice' wording; for dietitian review.
 */
export function rateCheck(weeklyWeights: readonly WeeklyWeight[]): RateCheckResult {
  const lossPcts: number[] = [];
  for (let i = 1; i < weeklyWeights.length; i++) {
    const previous = weeklyWeights[i - 1]!;
    const current = weeklyWeights[i]!;
    const days = daysBetween(previous.date, current.date);
    if (days < RATE_CHECK_MIN_INTERVAL_DAYS || days > RATE_CHECK_MAX_INTERVAL_DAYS) {
      lossPcts.push(Number.NaN);
      continue;
    }
    const lossPct = ((previous.weightKg - current.weightKg) / previous.weightKg) * 100;
    lossPcts.push((lossPct / days) * DAYS_IN_WEEK);
  }
  const tooFastInARow = (count: number) =>
    lossPcts.length >= count && lossPcts.slice(-count).every((pct) => pct > RATE_CHECK_LOSS_PCT);
  const latest = lossPcts.at(-1);
  return {
    deficitHalved: tooFastInARow(RATE_CHECK_INTERVALS_TO_HALVE),
    prompt: tooFastInARow(RATE_CHECK_INTERVALS_TO_PROMPT),
    weeklyLossPct: latest === undefined || Number.isNaN(latest) ? null : latest,
  };
}
