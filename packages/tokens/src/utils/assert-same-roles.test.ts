import { describe, expect, it } from 'vitest';
import type { Token } from '../types.ts';
import { assertSameRoles } from './assert-same-roles.ts';

const tokens = (...roles: string[]): Token[] =>
  roles.map((r) => ({ path: r.split('.'), type: undefined, value: '' }));

describe('assertSameRoles', () => {
  it('accepts the same roles in a different order', () => {
    expect(() =>
      assertSameRoles(tokens('color.bg', 'color.text'), tokens('color.text', 'color.bg')),
    ).not.toThrow();
  });

  it('names a role missing in dark', () => {
    expect(() => assertSameRoles(tokens('color.bg', 'color.focus'), tokens('color.bg'))).toThrow(
      /Missing in dark: \[color\.focus\]; only in dark: \[\]/,
    );
  });

  it('names a role only in dark', () => {
    expect(() => assertSameRoles(tokens('color.bg'), tokens('color.bg', 'color.extra'))).toThrow(
      /Missing in dark: \[\]; only in dark: \[color\.extra\]/,
    );
  });
});
