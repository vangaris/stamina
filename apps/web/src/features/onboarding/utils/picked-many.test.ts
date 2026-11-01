import { Weekday } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { pickedMany } from './picked-many.ts';

const DAYS = Object.values(Weekday);

describe('pickedMany', () => {
  it('returns the chosen values in the order of the options, not the order of choosing', () => {
    expect(pickedMany(['sat', 'mon', 'wed'], DAYS)).toEqual([
      Weekday.Mon,
      Weekday.Wed,
      Weekday.Sat,
    ]);
  });

  it('drops anything that is not one of the options', () => {
    expect(pickedMany(['mon', 'noday'], DAYS)).toEqual([Weekday.Mon]);
  });

  it.each([[null], ['mon'], [[]]])('returns an empty list for %j', (model) => {
    expect(pickedMany(model, DAYS)).toEqual([]);
  });
});
