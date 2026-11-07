import type { MealTemplate, PickTemplateInput } from '../types.ts';

/**
 * One template for a slot: the person's cooking effort when enough candidates fit it to give each
 * slot of that kind its own, else any candidate; never one already given to another slot of the day
 * while another fits; then a rotation by day and slot position so the same day always gives the
 * same answer.
 */
export function pickTemplate(input: PickTemplateInput): MealTemplate | undefined {
  const preferred = input.candidates.filter((template) => template.effort === input.effort);
  const effortPool = preferred.length >= input.slotsOfKind ? preferred : input.candidates;
  const freshIn = (pool: readonly MealTemplate[]) =>
    pool.filter((template) => !input.taken.has(template.id));
  const pool = [freshIn(effortPool), freshIn(input.candidates), effortPool].find(
    (candidates) => candidates.length > 0,
  );
  if (!pool) return undefined;
  const index = (((input.dayNumber + input.slotIndex) % pool.length) + pool.length) % pool.length;
  return pool[index];
}
