import { describe, expect, it } from 'vitest';
import { BodyArea } from '../enums/body-area.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import {
  adaptationContext,
  layout,
  LIBRARY,
  PADEL_GENERATION,
} from '../testing/adaptation-fixtures.ts';
import type { AdaptationContext, GenerationBasis } from '../types.ts';
import { reviseAvoidingAreas } from './revise-avoiding-areas.ts';

const { Lower, Upper, Recovery } = SessionFocus;
const byId = new Map(LIBRARY.map((exercise) => [exercise.id, exercise]));
const loads = (exerciseId: string, area: BodyArea) =>
  byId.get(exerciseId)!.highLoadAreas.includes(area);

describe('reviseAvoidingAreas', () => {
  const sessions = layout([Recovery, '2026-11-02'], [Upper, '2026-11-04'], [Lower, '2026-11-07']);
  const ctx = (excludedAreas: BodyArea[], overrides: Partial<AdaptationContext> = {}) =>
    adaptationContext({
      today: '2026-11-03',
      sessions,
      generation: { ...PADEL_GENERATION, excludedAreas },
      ...overrides,
    });

  it('returns nothing when no upcoming Session touches an excluded area', () => {
    expect(reviseAvoidingAreas(ctx([]))).toEqual([]);
    expect(reviseAvoidingAreas(ctx([BodyArea.Neck]))).toEqual([]);
  });

  it('re-picks only the Sessions with an exercise on an excluded area, same focus, same day', () => {
    const revised = reviseAvoidingAreas(ctx([BodyArea.Wrist]));
    expect(revised.map(({ supersedes }) => supersedes)).toEqual(['s3']);
    const [lower] = revised;
    expect(lower).toMatchObject({
      focus: Lower,
      date: '2026-11-07',
      minutes: sessions[2]!.minutes,
    });
    for (const { exerciseId } of lower!.exercises)
      expect(loads(exerciseId, BodyArea.Wrist)).toBe(false);
    expect(lower!.exercises.map(({ slot }) => slot)).toEqual(
      sessions[2]!.exercises.map(({ slot }) => slot),
    );
  });

  it('keeps an exercise that is still allowed, with its prescription', () => {
    const [lower] = reviseAvoidingAreas(ctx([BodyArea.Wrist]));
    const keptBefore = sessions[2]!.exercises.find(({ exerciseId }) => exerciseId === 'hinge-1')!;
    expect(lower!.exercises).toContainEqual(keptBefore);
    expect(lower!.exercises.map(({ exerciseId }) => exerciseId)).not.toContain('carry-2');
  });

  it('never gives a new exercise more sets or fewer reps in reserve than the one it stands in for', () => {
    const [lower] = reviseAvoidingAreas(ctx([BodyArea.Knee, BodyArea.Hip]));
    lower!.exercises.forEach((exercise, index) => {
      const before = sessions[2]!.exercises[index]!;
      expect(exercise.sets).toBeLessThanOrEqual(before.sets);
      if (before.rir !== null && exercise.rir !== null) {
        expect(exercise.rir).toBeGreaterThanOrEqual(before.rir);
      }
    });
  });

  it('does not give two Sessions the same new exercise', () => {
    const revised = reviseAvoidingAreas(ctx([BodyArea.Knee]));
    expect(revised.map(({ supersedes }) => supersedes)).toEqual(['s2', 's3']);
    const added = revised.map((revision, index) => {
      const before = new Set(sessions[index + 1]!.exercises.map((e) => e.exerciseId));
      return revision.exercises.map((e) => e.exerciseId).filter((id) => !before.has(id));
    });
    expect(added[0]!.length).toBeGreaterThan(0);
    expect(added[1]!.length).toBeGreaterThan(0);
    expect(added[0]!.filter((id) => added[1]!.includes(id))).toEqual([]);
  });

  it('leaves out Sessions that are finished, started, or before today', () => {
    const touched = ctx([BodyArea.Knee, BodyArea.Shoulder]);
    expect(reviseAvoidingAreas(touched).map(({ supersedes }) => supersedes)).toEqual(['s2', 's3']);
    const done = sessions.map((s) =>
      s.id === 's2'
        ? { ...s, started: true }
        : s.id === 's3'
          ? { ...s, started: true, finished: true }
          : s,
    );
    expect(
      reviseAvoidingAreas(ctx([BodyArea.Knee, BodyArea.Shoulder], { sessions: done })),
    ).toEqual([]);
    const late = ctx([BodyArea.Knee, BodyArea.Shoulder], { today: '2026-11-05' });
    expect(reviseAvoidingAreas(late).map(({ supersedes }) => supersedes)).toEqual(['s3']);
    const today = ctx([BodyArea.Knee, BodyArea.Shoulder], { today: '2026-11-04' });
    expect(reviseAvoidingAreas(today).map(({ supersedes }) => supersedes)).toEqual(['s2', 's3']);
  });

  it('becomes a Recovery Session when the library cannot fill the focus', () => {
    const generation: GenerationBasis = {
      ...PADEL_GENERATION,
      excludedAreas: [BodyArea.Knee, BodyArea.Hip, BodyArea.LowerBack],
      library: LIBRARY.filter(({ id }) => id !== 'squat-4' && id !== 'hinge-4'),
    };
    const lower = reviseAvoidingAreas(ctx([], { generation })).find(
      ({ supersedes }) => supersedes === 's3',
    );
    expect(lower).toMatchObject({ focus: Recovery, supersedes: 's3', date: '2026-11-07' });
    expect(new Set(lower!.exercises.map(({ slot }) => slot))).toEqual(
      new Set([SessionSlot.WarmUp, SessionSlot.AccessoriesCore, SessionSlot.CoolDown]),
    );
    for (const { exerciseId } of lower!.exercises) {
      expect(
        [BodyArea.Knee, BodyArea.Hip, BodyArea.LowerBack].some((area) => loads(exerciseId, area)),
      ).toBe(false);
    }
  });

  it('leaves a Session out when not even a Recovery Session can be filled', () => {
    const generation: GenerationBasis = {
      ...PADEL_GENERATION,
      excludedAreas: [BodyArea.Knee],
      library: LIBRARY.filter(({ slots }) => !slots.includes(SessionSlot.AccessoriesCore)),
    };
    expect(reviseAvoidingAreas(ctx([], { generation }))).toEqual([]);
  });

  it('avoids the area for a Recovery Session too', () => {
    const generation: GenerationBasis = {
      ...PADEL_GENERATION,
      excludedAreas: [BodyArea.Knee],
      library: LIBRARY,
    };
    const onlyRecovery = layout([Recovery, '2026-11-05']);
    const withKnee = onlyRecovery.map((s) => ({
      ...s,
      exercises: s.exercises.map((e, index) =>
        index === 2 ? { ...e, exerciseId: 'jump-1', slot: SessionSlot.AccessoriesCore } : e,
      ),
    }));
    const revised = reviseAvoidingAreas(ctx([], { generation, sessions: withKnee }));
    expect(revised).toHaveLength(1);
    expect(revised[0]!.focus).toBe(Recovery);
    expect(revised[0]!.exercises.some(({ exerciseId }) => exerciseId === 'jump-1')).toBe(false);
  });
});
