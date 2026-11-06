import { describe, expect, it } from 'vitest';
import { sessionExerciseIds } from './session-exercise-ids.ts';

const variant = (exerciseId: string) => ({ exerciseId, name: { en: exerciseId, el: null } });

describe('sessionExerciseIds', () => {
  it('lists the planned exercise and each tagged variant it has', () => {
    expect(
      sessionExerciseIds({ exerciseId: 'a', easier: variant('b'), harder: variant('c') }),
    ).toEqual(['a', 'b', 'c']);
    expect(sessionExerciseIds({ exerciseId: 'a', easier: null, harder: variant('c') })).toEqual([
      'a',
      'c',
    ]);
    expect(sessionExerciseIds({ exerciseId: 'a', easier: null, harder: null })).toEqual(['a']);
  });
});
