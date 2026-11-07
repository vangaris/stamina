import { describe, expect, it } from 'vitest';
import { checkinFact } from '../testing/adaptation-fixtures.ts';
import { isPoorCheckin } from './is-poor-checkin.ts';

describe('isPoorCheckin', () => {
  const poor = (answers: [number, number, number]) =>
    isPoorCheckin(checkinFact('c', '2026-11-04', answers));

  it('is poor when two of the three answers are 2 or below', () => {
    expect(poor([2, 2, 5])).toBe(true);
    expect(poor([5, 1, 2])).toBe(true);
    expect(poor([2, 5, 1])).toBe(true);
    expect(poor([1, 1, 1])).toBe(true);
  });

  it('is not poor with one low answer, or answers of 3', () => {
    expect(poor([1, 5, 5])).toBe(false);
    expect(poor([3, 3, 3])).toBe(false);
    expect(poor([2, 3, 3])).toBe(false);
  });
});
