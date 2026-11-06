import type { LogSet } from '@stamina/contracts';
import { Emphasis } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { testFakeSession as session } from '../testing/test-fake-session.ts';
import type { LocalSessionLog } from '../types.ts';
import { buildFakeSessionDetail } from './build-fake-session-detail.ts';
import { mergeLocalSessionLog } from './merge-local-session-log.ts';

const RECORDED_AT = '2026-11-06T10:30:00.000Z';
const noLocal: LocalSessionLog = { sets: [], finish: null };

function set(id: string, exerciseId: string, setNumber: number): LogSet {
  return { id, exerciseId, setNumber, weightKg: 40, reps: 5, rpe: 8 };
}

function setup() {
  const base = buildFakeSessionDetail(session, Emphasis.Strength, [], null);
  const main = base.exercises.find((exercise) => exercise.easier !== null);
  if (!main?.easier) throw new Error('no RPE-guided exercise');
  return { detail: base, main, easier: main.easier.exerciseId };
}

const loggedOf = (merged: ReturnType<typeof mergeLocalSessionLog>, id: string) =>
  merged.exercises.find((exercise) => exercise.id === id)?.loggedSets.map((s) => s.id);

describe('mergeLocalSessionLog', () => {
  it('adds local sets to their exercise in set order, a tagged variant included', () => {
    const { main, easier } = setup();
    const withServer = buildFakeSessionDetail(
      session,
      Emphasis.Strength,
      [set('s1', main.exerciseId, 1)],
      null,
    );

    const merged = mergeLocalSessionLog(withServer, {
      sets: [set('s3', main.exerciseId, 3), set('s2', easier, 2)],
      finish: null,
    });

    expect(loggedOf(merged, main.id)).toEqual(['s1', 's2', 's3']);
  });

  it('ignores a local set the server already has, by id or by set number', () => {
    const { main } = setup();
    const server = buildFakeSessionDetail(
      session,
      Emphasis.Strength,
      [set('s1', main.exerciseId, 1)],
      null,
    );

    const merged = mergeLocalSessionLog(server, {
      sets: [set('s1', main.exerciseId, 1), set('other-device', main.exerciseId, 1)],
      finish: null,
    });

    expect(loggedOf(merged, main.id)).toEqual(['s1']);
  });

  it('drops a local set for an exercise that is not in the Session', () => {
    const { detail } = setup();

    const merged = mergeLocalSessionLog(detail, {
      sets: [set('x', 'not-in-session', 1)],
      finish: null,
    });

    expect(merged.exercises.flatMap((exercise) => exercise.loggedSets)).toEqual([]);
  });

  it('shows the local finish as finished with Load = RPE x minutes, planned minutes by default', () => {
    const { detail } = setup();

    const planned = mergeLocalSessionLog(detail, {
      sets: [],
      finish: { finish: { id: 'f1', rpe: 7 }, recordedAt: RECORDED_AT },
    });
    const reported = mergeLocalSessionLog(detail, {
      sets: [],
      finish: { finish: { id: 'f1', rpe: 7, minutes: 30 }, recordedAt: RECORDED_AT },
    });

    expect(planned.finished).toEqual({
      id: 'f1',
      rpe: 7,
      minutes: session.minutes,
      load: 7 * session.minutes,
      finishedAt: RECORDED_AT,
    });
    expect(reported.finished).toMatchObject({ minutes: 30, load: 210 });
  });

  it("keeps the server's finish over the local one", () => {
    const { detail } = setup();
    const finished = {
      id: 'server',
      rpe: 9,
      minutes: 50,
      load: 450,
      finishedAt: '2026-11-06T11:00:00.000Z',
    };

    const merged = mergeLocalSessionLog(
      { ...detail, finished },
      { sets: [], finish: { finish: { id: 'local', rpe: 5 }, recordedAt: RECORDED_AT } },
    );

    expect(merged.finished).toEqual(finished);
  });

  it('changes neither input', () => {
    const { detail, main } = setup();
    const local: LocalSessionLog = { sets: [set('s1', main.exerciseId, 1)], finish: null };
    const before = structuredClone({ detail, local });

    mergeLocalSessionLog(detail, local);

    expect({ detail, local }).toEqual(before);
    expect(mergeLocalSessionLog(detail, noLocal)).toEqual(detail);
  });
});
