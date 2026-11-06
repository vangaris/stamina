import { describe, expect, it } from 'vitest';
import { BodyArea } from '../enums/body-area.ts';
import { mergeExcludedAreas } from './merge-excluded-areas.ts';

describe('mergeExcludedAreas', () => {
  it('lists Screening areas first, then new-pain areas, each once', () => {
    expect(
      mergeExcludedAreas([BodyArea.Knee, BodyArea.Hip], {
        excludedAreas: [BodyArea.Hip, BodyArea.Wrist],
      }),
    ).toEqual([BodyArea.Knee, BodyArea.Hip, BodyArea.Wrist]);
  });
});
