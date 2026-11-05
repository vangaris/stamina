import { LoadGuidance } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { LoadMessageKey } from '../enums/load-message-key.ts';
import { makeExercise } from '../testing/make-program.ts';
import { toLoadView } from './to-load-view.ts';

describe('toLoadView', () => {
  it('says how many more reps the weight should leave', () => {
    expect(toLoadView(makeExercise({ rir: 2 }))).toEqual({
      key: LoadMessageKey.RpeGuided,
      params: { rir: 2 },
    });
  });

  it('says bodyweight for exercises that need no equipment', () => {
    expect(toLoadView(makeExercise({ loadGuidance: LoadGuidance.Bodyweight }))?.key).toBe(
      LoadMessageKey.Bodyweight,
    );
  });

  it('has nothing to say where there is no weight', () => {
    expect(
      toLoadView(makeExercise({ loadGuidance: LoadGuidance.None, rir: null })),
    ).toBeUndefined();
  });
});
