import { describe, expect, it } from 'vitest';
import { targetRpe } from './target-rpe.ts';

describe('targetRpe', () => {
  it('is 10 minus the reps in reserve', () => {
    expect(targetRpe(3)).toBe(7);
    expect(targetRpe(0)).toBe(10);
    expect(targetRpe(2)).toBe(8);
  });
});
