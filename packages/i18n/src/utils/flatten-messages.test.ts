import { describe, expect, it } from 'vitest';
import { flattenMessages } from './flatten-messages.ts';

describe('flattenMessages', () => {
  it('joins nested keys with dots', () => {
    expect(flattenMessages({ a: { b: { c: 'x' } }, d: 'y' })).toEqual({ 'a.b.c': 'x', d: 'y' });
  });

  it('returns an empty object for an empty tree', () => {
    expect(flattenMessages({})).toEqual({});
  });
});
