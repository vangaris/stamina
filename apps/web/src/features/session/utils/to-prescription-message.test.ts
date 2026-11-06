import { PrescriptionUnit } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { TargetMessageKey } from '../enums/target-message-key.ts';
import { toPrescriptionMessage } from './to-prescription-message.ts';

const base = { sets: 3, repMin: 4, repMax: 6, unit: PrescriptionUnit.Reps };

describe('toPrescriptionMessage', () => {
  it('reads sets and a rep range', () => {
    expect(toPrescriptionMessage(base)).toEqual({
      key: TargetMessageKey.Reps,
      params: { sets: 3, range: '4-6' },
    });
  });

  it('shows a single number where the range has one end', () => {
    expect(toPrescriptionMessage({ ...base, repMin: 10, repMax: 10 }).params).toMatchObject({
      range: '10',
    });
  });

  it('counts seconds for a timed hold', () => {
    expect(toPrescriptionMessage({ ...base, unit: PrescriptionUnit.Seconds }).key).toBe(
      TargetMessageKey.Seconds,
    );
  });
});
