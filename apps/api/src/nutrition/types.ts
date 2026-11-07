import type { SavedProfile } from '@stamina/contracts';
import type { profile } from '../db/schema.ts';

export type NutritionProfileRow = typeof profile.$inferSelect;

/** How a sport is named on a profile or an Activity; what its Sport Profile is looked up by. */
export type SportRef = SavedProfile['sport'];
