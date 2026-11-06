import { describe, expect, it } from 'vitest';
import { Intensity } from '../enums/intensity.ts';
import { Weekday } from '../enums/weekday.ts';
import { plannedActivities } from './planned-activities.ts';

// 2026-11-06 is a Friday.
const STARTS_ON = '2026-11-06';
const padel = {
  playDays: [Weekday.Tue, Weekday.Fri],
  playVaries: false,
  playMinutes: 90,
  playIntensity: Intensity.Hard,
};

describe('plannedActivities', () => {
  it('plans one Activity per play day of the week, in date order', () => {
    expect(plannedActivities(STARTS_ON, padel)).toEqual([
      { date: '2026-11-06', weekday: Weekday.Fri, minutes: 90, intensity: Intensity.Hard },
      { date: '2026-11-10', weekday: Weekday.Tue, minutes: 90, intensity: Intensity.Hard },
    ]);
  });

  it('plans none when the sport varies, whatever days are on the profile', () => {
    expect(plannedActivities(STARTS_ON, { ...padel, playVaries: true })).toEqual([]);
  });

  it('plans none when there are no play days', () => {
    expect(plannedActivities(STARTS_ON, { ...padel, playDays: [] })).toEqual([]);
  });
});
