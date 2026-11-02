import { Weekday } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { pickedOne } from './picked-one.ts';

const DAYS = Object.values(Weekday);

describe('pickedOne', () => {
  it('returns the chosen value as the typed one', () => {
    expect(pickedOne('tue', DAYS)).toBe(Weekday.Tue);
    expect(pickedOne(45, [30, 45, 60])).toBe(45);
  });

  it.each([[null], [['mon']], ['noday'], ['45']])('returns nothing for %j', (model) => {
    expect(pickedOne(model, DAYS)).toBeUndefined();
  });
});
