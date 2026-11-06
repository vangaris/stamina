import { LOWER_BODY_PATTERNS } from '../config.ts';
import { BodyHalf } from '../enums/body-half.ts';
import type { MovementPattern } from '../enums/movement-pattern.ts';

/** The half of the body a movement pattern loads: squat, hinge, lunge and the jump and cutting patterns are lower; the rest upper. */
export function bodyHalfOf(pattern: MovementPattern): BodyHalf {
  return LOWER_BODY_PATTERNS.includes(pattern) ? BodyHalf.Lower : BodyHalf.Upper;
}
