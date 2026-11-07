import { z } from 'zod';
import { foodIdSchema } from './meal-log-schema.ts';

const whole = z.number().int().min(0);

/**
 * A fixed template scaled to one slot's targets. Names, household measures and units are not
 * sent: clients render them from the domain data in the person's language, offline. A client that
 * does not know an id draws no title or portion for it.
 */
export const mealIdeaSchema = z.object({
  templateId: foodIdSchema,
  portions: z.array(
    z.object({
      ingredientId: foodIdSchema,
      grams: z.number().int().min(1),
    }),
  ),
  kcal: whole,
  proteinG: whole,
  carbsG: whole,
  fatG: whole,
});
