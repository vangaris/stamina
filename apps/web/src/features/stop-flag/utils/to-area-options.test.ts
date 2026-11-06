import { describe, expect, it } from 'vitest';
import { BODY_AREAS } from '../../safety/index.ts';
import { toAreaOptions } from './to-area-options.ts';

describe('toAreaOptions', () => {
  it('has a chip for every body area, in order, labelled by its translation', () => {
    const options = toAreaOptions((key) => `t:${key}`);

    expect(options.map(({ value }) => value)).toEqual([...BODY_AREAS]);
    expect(options[0]?.label).toBe(`t:screening.bodyAreas.options.${BODY_AREAS[0]}`);
  });
});
