import { describe, expect, it } from 'vitest';
import { makeLoggedSet, makeSessionDetail } from '../testing/make-session-detail.ts';
import { buildExerciseViews } from './build-exercise-views.ts';

describe('buildExerciseViews', () => {
  const detail = makeSessionDetail();
  const main = detail.exercises[1]!;

  it('lists the planned exercises in order', () => {
    const views = buildExerciseViews(detail, {});

    expect(views.map((view) => view.exerciseId)).toEqual(['leg-swings', 'goblet-squat', 'plank']);
    expect(views.every((view) => !view.swapped)).toBe(true);
  });

  it('counts the sets already logged, on either exercise', () => {
    const logged = makeSessionDetail({
      exercises: [
        detail.exercises[0]!,
        {
          ...main,
          loggedSets: [
            makeLoggedSet({ setNumber: 1 }),
            makeLoggedSet({ setNumber: 2, exerciseId: 'box-squat' }),
          ],
        },
        detail.exercises[2]!,
      ],
    });

    expect(buildExerciseViews(logged, {})[1]?.doneSets).toBe(2);
  });

  it('logs against the variant and shows its name once swapped', () => {
    const [, view] = buildExerciseViews(detail, { [main.id]: 'box-squat' });

    expect(view).toMatchObject({
      exerciseId: 'box-squat',
      name: { en: 'Box squat' },
      swapped: true,
    });
  });

  it('ignores a swap to an exercise the planned one is not tagged with', () => {
    const [, view] = buildExerciseViews(detail, { [main.id]: 'barbell-squat' });

    expect(view).toMatchObject({ exerciseId: 'goblet-squat', swapped: false });
  });
});
