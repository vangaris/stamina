import { describe, expect, it } from 'vitest';
import { argumentNames } from './argument-names.ts';

describe('argumentNames', () => {
  it('collects sorted unique names, including plural/select branches and tags', () => {
    expect(argumentNames('{b} {a} {b}')).toEqual(['a', 'b']);
    expect(argumentNames('{n, plural, one {# {unit}} other {# {unit}s}}')).toEqual(['n', 'unit']);
    expect(argumentNames('{g, select, f {{x}} other {<b>{y}</b>}}')).toEqual(['b', 'g', 'x', 'y']);
  });

  it('is empty for plain text', () => {
    expect(argumentNames('Hello')).toEqual([]);
  });
});
