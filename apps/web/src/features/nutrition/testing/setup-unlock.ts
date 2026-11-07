import { vi } from 'vitest';
import { useNutrition } from '../composables/useNutrition.ts';
import { useUnlockMeals } from '../composables/useUnlockMeals.ts';
import { createMockMediator, LOCAL_NOW } from './create-mock-mediator.ts';

/**
 * `useUnlockMeals` over a mock mediator. Once saved, the day is read again by `useNutrition` on
 * the person's clock, as the Meals page does.
 */
export function setupUnlock() {
  const mock = createMockMediator();
  const onNavigate = vi.fn();
  const nutrition = useNutrition({ onNavigate, mediator: mock.mediator, now: () => LOCAL_NOW });
  const onSaved = vi.fn(() => nutrition.load());
  const flow = useUnlockMeals({ onNavigate, onSaved, mediator: mock.mediator });
  return { flow, nutrition, ...mock, onNavigate, onSaved };
}
