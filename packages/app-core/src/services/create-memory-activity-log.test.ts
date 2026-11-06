import { SportKind, type LogActivity } from '@stamina/contracts';
import { Intensity, LaunchSport } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { createMemoryActivityLog } from './create-memory-activity-log.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const activity = (id: string): LogActivity => ({
  id,
  sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
  date: '2026-11-06',
  minutes: 60,
  intensity: Intensity.Moderate,
  hot: false,
});

describe('createMemoryActivityLog', () => {
  it('lists what was added, once per id, keeping the first recordedAt', async () => {
    const log = createMemoryActivityLog();
    await log.add(activity('a'), RECORDED_AT);
    await log.add(activity('a'), 'later');
    await log.add(activity('b'), RECORDED_AT);

    expect(await log.list()).toEqual([
      { activity: activity('a'), recordedAt: RECORDED_AT },
      { activity: activity('b'), recordedAt: RECORDED_AT },
    ]);
  });

  it('removes by id and clears everything', async () => {
    const log = createMemoryActivityLog();
    await log.add(activity('a'), RECORDED_AT);
    await log.add(activity('b'), RECORDED_AT);
    await log.remove('a');

    expect((await log.list()).map((row) => row.activity.id)).toEqual(['b']);

    log.clear();
    expect(await log.list()).toEqual([]);
  });
});
