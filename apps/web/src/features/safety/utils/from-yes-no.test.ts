import { describe, expect, it } from 'vitest';
import { YesNo } from '../enums/yes-no.ts';
import { fromYesNo } from './from-yes-no.ts';

describe('fromYesNo', () => {
  it('reads both chips', () => {
    expect(fromYesNo(YesNo.Yes)).toBe(true);
    expect(fromYesNo(YesNo.No)).toBe(false);
  });

  it('reads anything else as unanswered', () => {
    expect(fromYesNo(null)).toBeUndefined();
    expect(fromYesNo('maybe')).toBeUndefined();
    expect(fromYesNo([YesNo.Yes])).toBeUndefined();
  });
});
