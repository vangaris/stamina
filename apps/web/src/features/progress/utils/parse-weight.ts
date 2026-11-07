import { MAX_BODY_WEIGHT_KG, MIN_BODY_WEIGHT_KG } from '@stamina/domain';
import { WEIGHT_PATTERN } from '../config.ts';

/** The kilograms a typed weight stands for ("72.5" or "72,5"), or nothing when it is not a weight the weigh-in accepts. */
export function parseWeight(text: string): number | undefined {
  const trimmed = text.trim();
  if (!WEIGHT_PATTERN.test(trimmed)) return undefined;
  const weightKg = Number(trimmed.replace(',', '.'));
  return weightKg >= MIN_BODY_WEIGHT_KG && weightKg <= MAX_BODY_WEIGHT_KG ? weightKg : undefined;
}
