import { describe, expect, it } from 'vitest';
import { formatValue } from './format-value.ts';

const token = (value: unknown) => ({ path: ['font', 'family', 'sans'], type: 'fontFamily', value });

describe('formatValue', () => {
  it('quotes font-stack entries that contain whitespace and leaves the rest bare', () => {
    expect(formatValue(token(['Segoe UI', 'system-ui', 'sans-serif']))).toBe(
      '"Segoe UI", system-ui, sans-serif',
    );
  });

  it('passes strings and numbers through unchanged', () => {
    expect(formatValue(token('0.5rem'))).toBe('0.5rem');
    expect(formatValue(token(400))).toBe('400');
  });

  it('rejects values it cannot print, naming the token and its type', () => {
    expect(() => formatValue(token({ nested: true }))).toThrow(
      /Unsupported value for font\.family\.sans \(fontFamily\)/,
    );
    expect(() => formatValue({ path: ['x'], type: undefined, value: null })).toThrow(/\(untyped\)/);
  });
});
