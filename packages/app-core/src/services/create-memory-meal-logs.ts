import type { Clearable, LocalMeal, MealLogStore } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie meal log. */
export function createMemoryMealLogs(): MealLogStore & Clearable {
  const rows = new Map<string, LocalMeal>();
  return {
    async add(meal, recordedAt) {
      if (!rows.has(meal.id)) rows.set(meal.id, { meal, recordedAt });
    },
    async remove(id) {
      rows.delete(id);
    },
    async list() {
      return [...rows.values()];
    },
    clear() {
      rows.clear();
    },
  };
}
