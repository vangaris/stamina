import { MEAL_ROTATION_EPOCH } from '../config.ts';
import type { MealIdea, MealIdeasInput } from '../types.ts';
import { daysBetween } from './days-between.ts';
import { eligibleTemplates } from './eligible-templates.ts';
import { pickTemplate } from './pick-template.ts';
import { scaleTemplate } from './scale-template.ts';
import { slotTargets } from './slot-targets.ts';

/**
 * The meal idea for each slot of the day, in slot order; `null` where no template is eligible.
 * No template is given to two slots of a day while another fits. The same date and person always
 * give the same ideas.
 */
export function mealIdeas(input: MealIdeasInput): (MealIdea | null)[] {
  const dayNumber = daysBetween(MEAL_ROTATION_EPOCH, input.date);
  const targets = slotTargets(input.targets, input.mealsPerDay);
  const taken = new Set<string>();
  return targets.map((target, slotIndex) => {
    const template = pickTemplate({
      candidates: eligibleTemplates(input, target.slot),
      effort: input.effort,
      dayNumber,
      slotIndex,
      slotsOfKind: targets.filter(({ slot }) => slot === target.slot).length,
      taken,
    });
    if (!template) return null;
    taken.add(template.id);
    return scaleTemplate(template, target);
  });
}
