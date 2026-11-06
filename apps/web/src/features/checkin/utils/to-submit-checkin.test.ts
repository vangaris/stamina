import { describe, expect, it } from 'vitest';
import { toSubmitCheckin } from './to-submit-checkin.ts';

const ID = '10000000-0000-4000-8000-000000000001';

describe('toSubmitCheckin', () => {
  it('carries the id, the day and the three answers', () => {
    expect(toSubmitCheckin(ID, '2026-11-06', { sleep: 4, soreness: 2, energy: 3 })).toEqual({
      id: ID,
      date: '2026-11-06',
      sleep: 4,
      soreness: 2,
      energy: 3,
    });
  });

  it('sends nothing while a question is open', () => {
    expect(toSubmitCheckin(ID, '2026-11-06', { sleep: 4, energy: 3 })).toBeUndefined();
    expect(toSubmitCheckin(ID, '2026-11-06', {})).toBeUndefined();
  });
});
