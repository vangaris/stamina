import { Units } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { defaultUnits } from './default-units.ts';

describe('defaultUnits', () => {
  it('is imperial only for en-US', () => {
    expect(defaultUnits(['en-US', 'el'])).toBe(Units.Imperial);
    expect(defaultUnits(['EN-us'])).toBe(Units.Imperial);
  });

  it.each([['en-GB'], ['en'], ['el-GR'], ['fr-FR']])('is metric for %s', (tag) => {
    expect(defaultUnits([tag])).toBe(Units.Metric);
  });

  it('follows the first preferred language, not a later en-US', () => {
    expect(defaultUnits(['el-GR', 'en-US'])).toBe(Units.Metric);
  });

  it('is metric when the device states no language', () => {
    expect(defaultUnits([])).toBe(Units.Metric);
  });
});
