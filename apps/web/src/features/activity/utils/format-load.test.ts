import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { formatLoad } from './format-load.ts';

describe('formatLoad', () => {
  it('groups thousands the way English does', () => {
    expect(formatLoad(1840, Locale.En)).toBe('1,840');
  });

  it('groups thousands the way Greek does', () => {
    expect(formatLoad(18400, Locale.El)).toBe('18.400');
  });

  it('rounds to a whole number', () => {
    expect(formatLoad(120.4, Locale.En)).toBe('120');
  });
});
