import { SessionSlot } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { makeSessionDetail } from '../testing/make-session-detail.ts';
import { buildExerciseViews } from './build-exercise-views.ts';
import { buildOverviewRows } from './build-overview-rows.ts';

describe('buildOverviewRows', () => {
  const detail = makeSessionDetail();
  const main = detail.exercises[1]!;

  it('lists every exercise with its slot, plan and sets done, and marks the one on screen', () => {
    const rows = buildOverviewRows(buildExerciseViews(detail, {}), 1, Locale.En);

    expect(
      rows.map((row) => [
        row.index,
        row.slot,
        row.name,
        row.doneSets,
        row.plannedSets,
        row.current,
      ]),
    ).toEqual([
      [0, SessionSlot.WarmUp, 'Leg swings', 0, 1, false],
      [1, SessionSlot.MainStrength, 'Goblet squat', 0, 3, true],
      [2, SessionSlot.AccessoriesCore, 'Plank', 0, 2, false],
    ]);
    expect(rows[1]?.prescription.params).toEqual({ sets: 3, range: '4-6' });
  });

  it('shows the swapped exercise by its own name, in the person language', () => {
    const rows = buildOverviewRows(
      buildExerciseViews(detail, { [main.id]: 'front-squat' }),
      0,
      Locale.El,
    );

    expect(rows[1]?.name).toBe('Μπροστινό κάθισμα');
  });
});
