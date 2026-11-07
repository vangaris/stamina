import type { Checkin } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import type { LocalCheckin } from '../types.ts';
import { mergeLocalCheckin } from './merge-local-checkin.ts';

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';

const server = (date: string, submittedAt: string, id = ID_A): Checkin => ({
  id,
  date,
  sleep: 4,
  soreness: 2,
  energy: 3,
  submittedAt,
});

const local = (date: string, recordedAt: string, id = ID_B): LocalCheckin => ({
  checkin: { id, date, sleep: 1, soreness: 5, energy: 1 },
  recordedAt,
});

describe('mergeLocalCheckin', () => {
  it('is the server Check-in when none is kept on the device', () => {
    const fromServer = server('2026-11-05', '2026-11-05T08:00:00.000Z');

    expect(mergeLocalCheckin(fromServer, null)).toBe(fromServer);
    expect(mergeLocalCheckin(null, null)).toBeNull();
  });

  it('is the local Check-in when the server has none, shown as sent when recorded', () => {
    expect(mergeLocalCheckin(null, local('2026-11-06', '2026-11-06T09:00:00.000Z'))).toEqual({
      id: ID_B,
      date: '2026-11-06',
      sleep: 1,
      soreness: 5,
      energy: 1,
      submittedAt: '2026-11-06T09:00:00.000Z',
    });
  });

  it('prefers the later day', () => {
    const fromServer = server('2026-11-06', '2026-11-06T07:00:00.000Z');

    expect(mergeLocalCheckin(fromServer, local('2026-11-05', '2026-11-06T09:00:00.000Z'))).toBe(
      fromServer,
    );
    expect(mergeLocalCheckin(fromServer, local('2026-11-07', '2026-11-06T06:00:00.000Z'))?.id).toBe(
      ID_B,
    );
  });

  it('breaks a tie on the day by when it was sent or recorded', () => {
    const fromServer = server('2026-11-06', '2026-11-06T07:00:00.000Z');

    expect(mergeLocalCheckin(fromServer, local('2026-11-06', '2026-11-06T08:00:00.000Z'))?.id).toBe(
      ID_B,
    );
    expect(mergeLocalCheckin(fromServer, local('2026-11-06', '2026-11-06T06:00:00.000Z'))).toBe(
      fromServer,
    );
  });

  it("is the server's copy for the same id", () => {
    const fromServer = server('2026-11-06', '2026-11-06T09:00:00.000Z', ID_B);

    expect(mergeLocalCheckin(fromServer, local('2026-11-06', '2026-11-06T10:00:00.000Z'))).toBe(
      fromServer,
    );
  });
});
