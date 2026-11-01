import { Weekday } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { pickedMany, pickedNumber, pickedOne, pickedOneOr } from './picked-value.ts';

describe('pickedOne', () => {
  it('returns the chosen value, or nothing when the group is cleared or holds many', () => {
    expect(pickedOne<Weekday>('mon')).toBe(Weekday.Mon);
    expect(pickedOne<Weekday>(null)).toBeUndefined();
    expect(pickedOne<Weekday>(['mon'])).toBeUndefined();
  });
});

describe('pickedOneOr', () => {
  it('returns the chosen value, or the current one when nothing came back', () => {
    expect(pickedOneOr<Weekday>('tue', Weekday.Mon)).toBe(Weekday.Tue);
    expect(pickedOneOr<Weekday>(null, Weekday.Mon)).toBe(Weekday.Mon);
  });
});

describe('pickedMany', () => {
  it('returns the chosen values, and nothing for a single or empty group', () => {
    expect(pickedMany<Weekday>(['mon', 'sat'])).toEqual([Weekday.Mon, Weekday.Sat]);
    expect(pickedMany<Weekday>('mon')).toEqual([]);
    expect(pickedMany<Weekday>(null)).toEqual([]);
  });
});

describe('pickedNumber', () => {
  it('returns the chosen number, and nothing for text, many or none', () => {
    expect(pickedNumber(45)).toBe(45);
    expect(pickedNumber('45')).toBeUndefined();
    expect(pickedNumber([45])).toBeUndefined();
    expect(pickedNumber(null)).toBeUndefined();
  });
});
