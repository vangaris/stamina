import type { Locale } from '@stamina/i18n';
import { localizedName } from '../../program/index.ts';
import { SwapKind } from '../enums/swap-kind.ts';
import type { ExerciseView, SwapOption } from '../types.ts';

/**
 * The exercises the person can swap to: the tagged easier and harder variants, except the one
 * already in use, and the planned exercise itself once swapped away from it.
 */
export function buildSwapOptions(view: ExerciseView, locale: Locale): SwapOption[] {
  const { exercise } = view;
  const options: SwapOption[] = [];
  if (view.swapped) {
    options.push({
      kind: SwapKind.Original,
      exerciseId: exercise.exerciseId,
      name: localizedName(exercise, locale),
    });
  }
  const variants = [
    { kind: SwapKind.Easier, variant: exercise.easier },
    { kind: SwapKind.Harder, variant: exercise.harder },
  ];
  for (const { kind, variant } of variants) {
    if (variant && variant.exerciseId !== view.exerciseId) {
      options.push({ kind, exerciseId: variant.exerciseId, name: localizedName(variant, locale) });
    }
  }
  return options;
}
