import { TEMPLATES } from '../data/templates.ts';
import type { MealSlot } from '../enums/meal-slot.ts';
import type { MealTemplate, TemplateEligibilityInput } from '../types.ts';
import { matchesDislike } from './matches-dislike.ts';
import { originsAllowedBy } from './origins-allowed-by.ts';
import { templateAllergens } from './template-allergens.ts';
import { templateOrigins } from './template-origins.ts';

/**
 * The templates of a slot kind a person may be given: every ingredient's origin fits the eating
 * pattern, no ingredient carries one of their allergens, and no dislike names any ingredient.
 * Judged from the ingredients, not from the template's `pattern` label.
 */
export function eligibleTemplates(input: TemplateEligibilityInput, slot: MealSlot): MealTemplate[] {
  const allowed = new Set(originsAllowedBy(input.pattern));
  const avoided = new Set(input.allergens);
  return TEMPLATES.filter(
    (template) =>
      template.slot === slot &&
      templateOrigins(template).every((origin) => allowed.has(origin)) &&
      !templateAllergens(template).some((allergen) => avoided.has(allergen)) &&
      !input.dislikes.some((dislike) => matchesDislike(dislike, template)),
  );
}
