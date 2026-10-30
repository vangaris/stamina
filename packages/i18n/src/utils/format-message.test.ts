import { describe, expect, it } from 'vitest';
import { formatMessage } from './format-message.ts';

describe('formatMessage', () => {
  it('applies the plural rules of the locale', () => {
    const message = '{n, plural, =0 {none} one {# set} other {# sets}}';
    expect(formatMessage('en', message, { n: 0 })).toBe('none');
    expect(formatMessage('en', message, { n: 1 })).toBe('1 set');
    expect(formatMessage('en', message, { n: 3 })).toBe('3 sets');
  });

  it('uses the Greek number format', () => {
    expect(formatMessage('el', '{n, number}', { n: 1234.5 })).toBe('1.234,5');
    expect(formatMessage('en', '{n, number}', { n: 1234.5 })).toBe('1,234.5');
  });
});
