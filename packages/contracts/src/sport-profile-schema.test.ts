import { BodyArea, Intensity, SeasonKind, SportMovement } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { sportProfileSchema } from './sport-profile-schema.ts';

const valid = {
  energyMix: { aerobic: 40, repeatedSprint: 40, explosive: 20 },
  keyMovements: [SportMovement.ChangeOfDirection, SportMovement.JumpLand],
  highLoadAreas: [BodyArea.Knee, BodyArea.Ankle],
  typicalActivity: { durationMinutes: 60, intensity: Intensity.Moderate },
  recoveryWindowHours: { lower: 24, upper: 24 },
  season: { kind: SeasonKind.YearRound, months: [] as number[] },
  metsPerIntensity: { easy: 4, moderate: 6, hard: 8 },
};
const accepts = (overrides: Record<string, unknown>) =>
  sportProfileSchema.safeParse({ ...valid, ...overrides }).success;

describe('sportProfileSchema', () => {
  it('accepts a complete profile', () => {
    expect(accepts({})).toBe(true);
  });

  it('ties the season kind to its months', () => {
    expect(accepts({ season: { kind: SeasonKind.YearRound, months: [1, 2, 3] } })).toBe(false);
    expect(accepts({ season: { kind: SeasonKind.Weather, months: [] } })).toBe(false);
    expect(accepts({ season: { kind: SeasonKind.League, months: [] } })).toBe(false);
    expect(accepts({ season: { kind: SeasonKind.Weather, months: [6, 7, 8] } })).toBe(true);
    expect(accepts({ season: { kind: SeasonKind.League, months: [9, 10] } })).toBe(true);
  });

  it('rejects a repeated key movement, high-load area or month', () => {
    expect(accepts({ keyMovements: [SportMovement.Push, SportMovement.Push] })).toBe(false);
    expect(accepts({ highLoadAreas: [BodyArea.Knee, BodyArea.Knee] })).toBe(false);
    expect(accepts({ season: { kind: SeasonKind.Weather, months: [6, 6] } })).toBe(false);
  });

  it('still checks the energy mix and the METs', () => {
    expect(accepts({ energyMix: { aerobic: 50, repeatedSprint: 50, explosive: 50 } })).toBe(false);
    expect(accepts({ metsPerIntensity: { easy: 8, moderate: 6, hard: 4 } })).toBe(false);
  });
});
