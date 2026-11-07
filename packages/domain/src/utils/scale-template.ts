import {
  MIN_PORTION_GRAMS,
  PORTION_ROUND_GRAMS,
  SCORE_EPSILON,
  SMALL_PORTION_BELOW_GRAMS,
  SMALL_PORTION_ROUND_GRAMS,
  TEMPLATE_SCALE_MAX,
  TEMPLATE_SCALE_MIN,
} from '../config.ts';
import type { MealIdea, MealTemplate, SlotTargets } from '../types.ts';
import { templateIngredients } from './template-ingredients.ts';

function clamp(value: number): number {
  return Math.min(TEMPLATE_SCALE_MAX, Math.max(TEMPLATE_SCALE_MIN, value));
}

/** Below 10 g the nearest gram (at least 1 g), so a pinch is not inflated; otherwise the nearest 5 g. */
function roundPortion(grams: number): number {
  const step = grams < SMALL_PORTION_BELOW_GRAMS ? SMALL_PORTION_ROUND_GRAMS : PORTION_ROUND_GRAMS;
  return Math.max(MIN_PORTION_GRAMS, Math.round(grams / step) * step);
}

/**
 * Scales a template to a slot with one factor, within the configured bounds, that minimises the
 * summed relative error of protein and carbs against the slot targets. The summed error is
 * piecewise linear in the factor, so its minimum is at a breakpoint or a bound. Amounts are rounded
 * to the nearest few grams and the idea's macros are computed from the rounded amounts.
 */
export function scaleTemplate(template: MealTemplate, target: SlotTargets): MealIdea {
  const ingredients = templateIngredients(template);
  const base = { proteinG: 0, carbsG: 0 };
  template.ingredients.forEach(({ grams }, index) => {
    const per100g = ingredients[index]?.per100g;
    if (!per100g) return;
    base.proteinG += (per100g.proteinG * grams) / 100;
    base.carbsG += (per100g.carbsG * grams) / 100;
  });

  const proteinTarget = Math.max(target.proteinG, 1);
  const carbsTarget = Math.max(target.carbsG, 1);
  const error = (k: number): number =>
    Math.abs(k * base.proteinG - proteinTarget) / proteinTarget +
    Math.abs(k * base.carbsG - carbsTarget) / carbsTarget;

  const candidates = [TEMPLATE_SCALE_MIN, TEMPLATE_SCALE_MAX];
  if (base.proteinG > 0) candidates.push(clamp(proteinTarget / base.proteinG));
  if (base.carbsG > 0) candidates.push(clamp(carbsTarget / base.carbsG));
  let factor = clamp(1);
  let best = error(factor);
  for (const candidate of candidates) {
    const candidateError = error(candidate);
    if (candidateError < best - SCORE_EPSILON) {
      best = candidateError;
      factor = candidate;
    }
  }

  const idea: MealIdea = {
    templateId: template.id,
    portions: [],
    kcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  template.ingredients.forEach(({ ingredientId, grams }, index) => {
    const rounded = roundPortion(grams * factor);
    idea.portions.push({ ingredientId, grams: rounded });
    const per100g = ingredients[index]?.per100g;
    if (!per100g) return;
    idea.kcal += (per100g.kcal * rounded) / 100;
    idea.proteinG += (per100g.proteinG * rounded) / 100;
    idea.carbsG += (per100g.carbsG * rounded) / 100;
    idea.fatG += (per100g.fatG * rounded) / 100;
  });
  idea.kcal = Math.round(idea.kcal);
  idea.proteinG = Math.round(idea.proteinG);
  idea.carbsG = Math.round(idea.carbsG);
  idea.fatG = Math.round(idea.fatG);
  return idea;
}
