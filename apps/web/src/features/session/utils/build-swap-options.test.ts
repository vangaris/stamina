import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { SwapKind } from '../enums/swap-kind.ts';
import { makeSessionDetail } from '../testing/make-session-detail.ts';
import { buildExerciseViews } from './build-exercise-views.ts';
import { buildSwapOptions } from './build-swap-options.ts';

describe('buildSwapOptions', () => {
  const detail = makeSessionDetail();
  const main = detail.exercises[1]!;

  it('offers the easier and the harder variant, named in the person language', () => {
    const [, view] = buildExerciseViews(detail, {});

    expect(buildSwapOptions(view!, Locale.El)).toEqual([
      { kind: SwapKind.Easier, exerciseId: 'box-squat', name: 'Box squat' },
      { kind: SwapKind.Harder, exerciseId: 'front-squat', name: 'Μπροστινό κάθισμα' },
    ]);
  });

  it('offers a way back to the planned exercise, and not the variant in use, once swapped', () => {
    const [, view] = buildExerciseViews(detail, { [main.id]: 'box-squat' });

    expect(buildSwapOptions(view!, Locale.En).map(({ kind }) => kind)).toEqual([
      SwapKind.Original,
      SwapKind.Harder,
    ]);
  });

  it('offers nothing for an exercise without variants', () => {
    const [view] = buildExerciseViews(detail, {});

    expect(buildSwapOptions(view!, Locale.En)).toEqual([]);
  });
});
