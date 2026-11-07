import { NEXT_MEAL_GRACE_MINUTES } from '../config.ts';

/**
 * The index of the meal to show first: the first one not logged yet whose time is not more than
 * the grace window past, else the first one not logged. Undefined when every meal is logged.
 */
export function pickNextMeal(
  meals: readonly { at: number; status: unknown }[],
  minuteOfDay: number,
): number | undefined {
  const open = meals.flatMap((meal, index) =>
    meal.status === null ? [{ at: meal.at, index }] : [],
  );
  const upcoming = open.find(({ at }) => minuteOfDay - at <= NEXT_MEAL_GRACE_MINUTES);
  return (upcoming ?? open[0])?.index;
}
