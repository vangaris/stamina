import { Intensity, activityLoad, activityRpe } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toLoadPreview } from './to-load-preview.ts';

describe('toLoadPreview', () => {
  it.each(Object.values(Intensity))('counts %s as minutes times its RPE', (intensity) => {
    const preview = toLoadPreview(90, intensity);

    expect(preview).toEqual({
      minutes: 90,
      rpe: activityRpe(intensity),
      load: activityLoad(intensity, 90),
    });
    expect(preview.load).toBe(preview.minutes * preview.rpe);
  });

  it('grows with the minutes and with the effort', () => {
    expect(toLoadPreview(60, Intensity.Moderate).load).toBeGreaterThan(
      toLoadPreview(30, Intensity.Moderate).load,
    );
    expect(toLoadPreview(60, Intensity.Hard).load).toBeGreaterThan(
      toLoadPreview(60, Intensity.Easy).load,
    );
  });
});
