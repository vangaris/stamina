import { normalizeValue } from './normalize-value.ts';

interface StepContext {
  step: number;
  min?: number | undefined;
  max?: number | undefined;
}

/** The value one `step` up (`1`) or down (`-1`) from `current`, rounded and clamped. */
export function stepValue(current: number, direction: 1 | -1, context: StepContext): number {
  return normalizeValue(current + direction * context.step, { current, ...context });
}
