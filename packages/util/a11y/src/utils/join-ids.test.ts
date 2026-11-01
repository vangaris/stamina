import { describe, expect, it } from 'vitest';
import { joinIds } from './join-ids.ts';

describe('joinIds', () => {
  it('joins the ids that are present, in order', () => {
    expect(joinIds('hint', undefined, 'error')).toBe('hint error');
  });

  it('skips false, null and empty strings so a condition can guard an id', () => {
    const hasError = false;
    expect(joinIds('hint', hasError && 'error', null, '')).toBe('hint');
  });

  it('is undefined when nothing is left, never an empty attribute', () => {
    expect(joinIds()).toBeUndefined();
    expect(joinIds(undefined, false, '')).toBeUndefined();
  });

  it('keeps a multi-id value from a parent as one part', () => {
    expect(joinIds('parent-a parent-b', 'hint')).toBe('parent-a parent-b hint');
  });
});
