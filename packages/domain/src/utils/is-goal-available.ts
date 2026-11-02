import { Goal } from '../enums/goal.ts';

/** Whether a Goal can be chosen. Body composition is unavailable while Nutrition is off. */
export function isGoalAvailable(goal: Goal, { nutritionOff }: { nutritionOff: boolean }): boolean {
  return !(nutritionOff && goal === Goal.BodyComposition);
}
