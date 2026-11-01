import { Key } from '@stamina/a11y';
import { computed, ref, type Ref } from 'vue';
import { boundState } from '../utils/bound-state.ts';
import { stepValue } from '../utils/step-value.ts';

interface UseStepperOptions {
  model: Ref<number>;
  step: () => number;
  min: () => number | undefined;
  max: () => number | undefined;
  disabled: () => boolean;
  /** Text read out after a button change (value plus unit). */
  text: (value: number) => string;
}

/** Stepping, bound state, keyboard handling and the polite announcement of a spinbutton. */
export function useStepper(options: UseStepperOptions) {
  const { model } = options;
  // Announces changes made with the buttons; empty until the first change.
  const announcement = ref('');

  const bounds = computed(() => boundState(model.value, options.min(), options.max()));
  const atMin = computed(() => bounds.value.atMin);
  const atMax = computed(() => bounds.value.atMax);

  /** Emits `next` only when it differs from the current value. */
  function commit(next: number, announce: boolean) {
    if (options.disabled() || next === model.value) return;
    model.value = next;
    if (announce) announcement.value = options.text(next);
  }

  function stepBy(direction: 1 | -1, announce: boolean) {
    commit(
      stepValue(model.value, direction, {
        step: options.step(),
        min: options.min(),
        max: options.max(),
      }),
      announce,
    );
  }

  // Arrow keys are handled here on the spinbutton, so the browser's own announcement of the new
  // value (aria-valuenow / valuetext) is used and the live region stays quiet to avoid a double read.
  function onKeydown(event: KeyboardEvent) {
    if (options.disabled() || event.altKey || event.ctrlKey || event.metaKey) return;
    const min = options.min();
    const max = options.max();
    switch (event.key) {
      case Key.ArrowUp:
      case Key.ArrowRight:
        stepBy(1, false);
        break;
      case Key.ArrowDown:
      case Key.ArrowLeft:
        stepBy(-1, false);
        break;
      case Key.Home:
        if (min === undefined) return;
        commit(min, false);
        break;
      case Key.End:
        if (max === undefined) return;
        commit(max, false);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return { announcement, atMin, atMax, stepBy, onKeydown };
}
