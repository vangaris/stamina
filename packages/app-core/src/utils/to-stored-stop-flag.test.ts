import { BodyArea, StopFlag } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toStoredStopFlag } from './to-stored-stop-flag.ts';

const ID = '00000000-0000-4000-8000-000000000001';
const REPORTED_AT = '2026-11-06T09:00:00.000Z';

describe('toStoredStopFlag', () => {
  it('reads a local flag as an open one with no area', () => {
    expect(
      toStoredStopFlag({
        report: { id: ID, flag: StopFlag.Fever, date: '2026-11-06' },
        reportedAt: REPORTED_AT,
      }),
    ).toEqual({
      flag: StopFlag.Fever,
      date: '2026-11-06',
      area: null,
      reportedAt: REPORTED_AT,
      confirmedAt: null,
    });
  });

  it('keeps the body area of new pain', () => {
    expect(
      toStoredStopFlag({
        report: { id: ID, flag: StopFlag.NewPain, date: '2026-11-06', bodyArea: BodyArea.Knee },
        reportedAt: REPORTED_AT,
      }).area,
    ).toBe(BodyArea.Knee);
  });
});
