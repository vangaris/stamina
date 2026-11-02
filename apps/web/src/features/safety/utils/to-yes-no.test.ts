import { describe, expect, it } from 'vitest';
import { YesNo } from '../enums/yes-no.ts';
import { toYesNo } from './to-yes-no.ts';

describe('toYesNo', () => {
  it('shows no chip for an unanswered question, so nothing is pre-selected', () => {
    expect(toYesNo(undefined)).toBeNull();
  });

  it('maps both answers', () => {
    expect(toYesNo(true)).toBe(YesNo.Yes);
    expect(toYesNo(false)).toBe(YesNo.No);
  });
});
