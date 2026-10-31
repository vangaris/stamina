import { describe, expect, it } from 'vitest';
import { pick } from './pick.ts';

describe('pick', () => {
  it('copies only the listed keys', () => {
    expect(pick({ a: 1, b: 2, secret: 'health' }, ['a', 'b'])).toEqual({ a: 1, b: 2 });
  });

  it('skips undefined and missing keys but keeps falsy values', () => {
    expect(
      pick({ a: undefined, b: 0, c: false, d: null, e: '' }, ['a', 'b', 'c', 'd', 'e', 'f']),
    ).toEqual({
      b: 0,
      c: false,
      d: null,
      e: '',
    });
  });
});
