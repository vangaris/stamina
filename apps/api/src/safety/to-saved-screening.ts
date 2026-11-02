import { savedScreeningSchema, type SavedScreening } from '@stamina/contracts';
import { resolveTrainingMode } from '@stamina/domain';
import type { ScreeningRow } from './types.ts';

/**
 * The stored row as the contract's `SavedScreening`: the outcome and the Training mode it
 * leads to, never the answers. The schema also guards against a corrupt row.
 */
export function toSavedScreening(row: ScreeningRow): SavedScreening {
  return savedScreeningSchema.parse({
    status: row.status,
    referral: row.referral,
    nutritionOff: row.nutritionOff,
    excludedAreas: row.excludedAreas,
    startingLevel: row.startingLevel,
    trainingMode: resolveTrainingMode({
      status: row.status,
      referral: row.referral,
      doctorOk: row.doctorOkAt !== null,
    }),
    takenAt: row.takenAt.toISOString(),
    doctorOkAt: row.doctorOkAt?.toISOString() ?? null,
  });
}
