import type { SubmitCheckin } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { createMemoryCheckins } from './create-memory-checkins.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const checkin = (id: string, date = '2026-11-06'): SubmitCheckin => ({
  id,
  date,
  sleep: 3,
  soreness: 2,
  energy: 4,
});

describe('createMemoryCheckins', () => {
  it('has no latest before anything is added', async () => {
    expect(await createMemoryCheckins().latest()).toBeNull();
  });

  it('keeps the first recordedAt for an id and reads the latest day', async () => {
    const checkins = createMemoryCheckins();
    await checkins.add(checkin('a'), RECORDED_AT);
    await checkins.add(checkin('a'), 'later');
    await checkins.add(checkin('b', '2026-11-05'), '2026-11-06T11:00:00.000Z');

    expect(await checkins.latest()).toEqual({ checkin: checkin('a'), recordedAt: RECORDED_AT });
  });

  it('removes by id and clears everything', async () => {
    const checkins = createMemoryCheckins();
    await checkins.add(checkin('a'), RECORDED_AT);
    await checkins.add(checkin('b', '2026-11-05'), RECORDED_AT);
    await checkins.remove('a');

    expect((await checkins.latest())?.checkin.id).toBe('b');

    checkins.clear();
    expect(await checkins.latest()).toBeNull();
  });
});
