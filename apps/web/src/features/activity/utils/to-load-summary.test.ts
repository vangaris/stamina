import { describe, expect, it } from 'vitest';
import { toLoadSummary } from './to-load-summary.ts';

describe('toLoadSummary', () => {
  it('pairs the week with the average', () => {
    expect(toLoadSummary({ load: 1840, average: 2100 })).toEqual({ load: 1840, average: 2100 });
  });

  it('keeps a missing average missing, not zero', () => {
    expect(toLoadSummary({ load: 300, average: null }).average).toBeNull();
  });
});
