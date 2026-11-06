import { describe, expect, it } from 'vitest';
import { Intensity } from '../enums/intensity.ts';
import { activityLoad } from './activity-load.ts';

describe('activityLoad', () => {
  it('multiplies the minutes by the RPE of the intensity', () => {
    expect(activityLoad(Intensity.Easy, 60)).toBe(240);
    expect(activityLoad(Intensity.Moderate, 60)).toBe(360);
    expect(activityLoad(Intensity.Hard, 90)).toBe(720);
  });

  it('is higher for a harder intensity over the same time', () => {
    expect(activityLoad(Intensity.Hard, 45)).toBeGreaterThan(activityLoad(Intensity.Moderate, 45));
    expect(activityLoad(Intensity.Moderate, 45)).toBeGreaterThan(activityLoad(Intensity.Easy, 45));
  });
});
