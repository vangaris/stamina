import { describe, expect, it } from 'vitest';
import { exerciseImageSchema, exerciseQuerySchema } from './exercise-schema.ts';

const image = {
  url: 'https://wger.de/media/exercise-images/1/x.png',
  author: 'Someone',
  authorUrl: 'https://example.org/someone',
  licence: 'CC-BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://wger.de/en/exercise/1/view/',
  wgerExerciseId: 1,
};

describe('exerciseImageSchema', () => {
  it('accepts https attribution links and no author link', () => {
    expect(exerciseImageSchema.safeParse(image).success).toBe(true);
    expect(exerciseImageSchema.safeParse({ ...image, authorUrl: null }).success).toBe(true);
  });

  it.each(['authorUrl', 'licenceUrl', 'sourceUrl'])(
    'rejects a javascript:, http: or data: link in %s',
    (key) => {
      for (const bad of [
        'javascript:alert(1)',
        'http://example.org/x',
        'data:text/html,<b>x</b>',
      ]) {
        expect(exerciseImageSchema.safeParse({ ...image, [key]: bad }).success, bad).toBe(false);
      }
    },
  );
});

describe('exerciseQuerySchema', () => {
  it('rejects an unknown key', () => {
    for (const key of ['excludedAreas', 'exclude_areas', 'area']) {
      expect(exerciseQuerySchema.safeParse({ [key]: 'knee' }).success, key).toBe(false);
    }
  });

  it('accepts no keys and the four known ones', () => {
    expect(exerciseQuerySchema.safeParse({}).success).toBe(true);
    expect(
      exerciseQuerySchema.safeParse({
        equipment: 'dumbbell,barbell',
        locations: 'home',
        slots: 'warm-up',
        excludeAreas: 'knee',
      }).success,
    ).toBe(true);
  });
});
