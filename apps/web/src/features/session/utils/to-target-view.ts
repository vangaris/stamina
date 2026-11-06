import type { StepperFormat } from '@stamina/ui-stepper';
import { toLoadView } from '../../program/index.ts';
import { SUGGESTED_WEIGHT_KEYS } from '../config.ts';
import { TargetMessageKey } from '../enums/target-message-key.ts';
import type { ExerciseView, MessageView, TargetView } from '../types.ts';
import { targetRpe } from './target-rpe.ts';
import { toPrescriptionMessage } from './to-prescription-message.ts';

/**
 * The lines under the exercise's name: sets and reps, the effort to stop at, and the weight (the
 * suggested one with how it was reached; otherwise how to find one). A swapped exercise gets no
 * suggestion, which was made for the planned one.
 */
export function toTargetView(view: ExerciseView, format: StepperFormat): TargetView {
  const { exercise, swapped } = view;
  const effort: MessageView | undefined =
    exercise.rir === null
      ? undefined
      : {
          key: TargetMessageKey.Effort,
          params: { rir: exercise.rir, rpe: targetRpe(exercise.rir) },
        };

  let weight: MessageView | undefined;
  if (!swapped && exercise.suggestedWeightKg !== null) {
    weight = {
      key: exercise.progression
        ? SUGGESTED_WEIGHT_KEYS[exercise.progression]
        : TargetMessageKey.SuggestedStart,
      params: { weight: format(exercise.suggestedWeightKg) },
    };
  } else {
    weight = toLoadView(exercise);
  }

  return { prescription: toPrescriptionMessage(exercise), effort, weight };
}
