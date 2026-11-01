import { Intensity } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toOptions } from './to-options.ts';

describe('toOptions', () => {
  it('keeps the values in order and labels each one', () => {
    expect(toOptions(Object.values(Intensity), (value) => value.toUpperCase())).toEqual([
      { value: Intensity.Easy, label: 'EASY' },
      { value: Intensity.Moderate, label: 'MODERATE' },
      { value: Intensity.Hard, label: 'HARD' },
    ]);
  });

  it('works for numbers too', () => {
    expect(toOptions([30, 45], (minutes) => `${minutes} min`)).toEqual([
      { value: 30, label: '30 min' },
      { value: 45, label: '45 min' },
    ]);
  });
});
