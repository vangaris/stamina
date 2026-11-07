import { describe, expect, it } from 'vitest';
import type { LocalCheckin } from '../types.ts';
import { latestLocalCheckin } from './latest-local-checkin.ts';

const row = (id: string, date: string, recordedAt: string): LocalCheckin => ({
  checkin: { id, date, sleep: 3, soreness: 3, energy: 3 },
  recordedAt,
});

describe('latestLocalCheckin', () => {
  it('is null for none', () => {
    expect(latestLocalCheckin([])).toBeNull();
  });

  it('is the latest day, then the latest recordedAt', () => {
    const rows = [
      row('a', '2026-11-05', '2026-11-06T12:00:00.000Z'),
      row('b', '2026-11-06', '2026-11-06T08:00:00.000Z'),
      row('c', '2026-11-06', '2026-11-06T09:00:00.000Z'),
    ];

    expect(latestLocalCheckin(rows)?.checkin.id).toBe('c');
    expect(latestLocalCheckin([...rows].reverse())?.checkin.id).toBe('c');
  });
});
