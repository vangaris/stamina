import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { SessionSlot, PrescriptionUnit } from '@stamina/domain';
import { makeLoggedSet, makeSessionDetail } from '../testing/make-session-detail.ts';
import { buildExerciseViews } from './build-exercise-views.ts';
import { buildFocusModel } from './build-focus-model.ts';

const detail = makeSessionDetail();
const views = buildExerciseViews(detail, {});

describe('buildFocusModel', () => {
  it('describes the exercise on screen and where it sits in the Session', () => {
    const model = buildFocusModel({ views, position: 1, addingSet: false, locale: Locale.En });

    expect(model).toMatchObject({
      slot: SessionSlot.MainStrength,
      position: 2,
      total: 3,
      name: 'Goblet squat',
      setNumber: 1,
      plannedSets: 3,
      doneSets: 0,
      dotTotal: 3,
      showSteppers: true,
      showWeight: true,
      unit: PrescriptionUnit.Reps,
      hasNextExercise: true,
      canSwap: true,
      swapped: false,
    });
  });

  it('names the exercise in Greek where there is a Greek name, and in English where not', () => {
    expect(buildFocusModel({ views, position: 1, addingSet: false, locale: Locale.El })?.name).toBe(
      'Κάθισμα goblet',
    );
    expect(buildFocusModel({ views, position: 0, addingSet: false, locale: Locale.El })?.name).toBe(
      'Leg swings',
    );
  });

  it('offers no weight stepper for bodyweight work and no swap without variants', () => {
    const model = buildFocusModel({ views, position: 2, addingSet: false, locale: Locale.En });

    expect(model).toMatchObject({ showWeight: false, canSwap: false, hasNextExercise: false });
  });

  it('keeps the steppers behind "Add a set" once the planned sets are done', () => {
    const base = makeSessionDetail();
    const done = buildExerciseViews(
      {
        ...base,
        exercises: [
          {
            ...base.exercises[0]!,
            loggedSets: [makeLoggedSet({ exerciseId: 'leg-swings' })],
          },
          ...base.exercises.slice(1),
        ],
      },
      {},
    );

    const closed = buildFocusModel({
      views: done,
      position: 0,
      addingSet: false,
      locale: Locale.En,
    });
    const open = buildFocusModel({ views: done, position: 0, addingSet: true, locale: Locale.En });

    expect(closed).toMatchObject({
      showSteppers: false,
      setNumber: 2,
      canAddSet: true,
      dotTotal: 1,
    });
    expect(open).toMatchObject({ showSteppers: true, dotTotal: 2 });
  });

  it('allows no set beyond the limit', () => {
    const base = makeSessionDetail();
    const full = buildExerciseViews(
      {
        ...base,
        exercises: [
          {
            ...base.exercises[0]!,
            loggedSets: Array.from({ length: 20 }, (_, index) =>
              makeLoggedSet({ setNumber: index + 1 }),
            ),
          },
          ...base.exercises.slice(1),
        ],
      },
      {},
    );

    expect(
      buildFocusModel({ views: full, position: 0, addingSet: false, locale: Locale.En })?.canAddSet,
    ).toBe(false);
  });

  it('is undefined for a position outside the Session', () => {
    expect(
      buildFocusModel({ views, position: 9, addingSet: false, locale: Locale.En }),
    ).toBeUndefined();
  });
});
