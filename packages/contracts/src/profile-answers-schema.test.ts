import { Goal, Intensity, LaunchSport, Need, Units, Weekday } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { SportKind } from './enums/sport-kind.ts';
import { profileAnswersSchema } from './profile-answers-schema.ts';

const valid = {
  needs: Need.Both,
  birthYear: 1990,
  country: 'GR',
  sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
  playDays: [Weekday.Tue, Weekday.Sat],
  playVaries: false,
  playMinutes: 90,
  playIntensity: Intensity.Hard,
  goal: Goal.SportPerformance,
  trainingWeek: {
    sessionsPerWeek: 3,
    sessionMinutes: 45,
    availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
  },
  locale: Locale.En,
  units: Units.Metric,
};

const accepts = (overrides: object) =>
  profileAnswersSchema.safeParse({ ...valid, ...overrides }).success;

describe('profileAnswersSchema', () => {
  it('accepts a complete answer set', () => {
    expect(profileAnswersSchema.safeParse(valid).success).toBe(true);
  });

  it('lets a minor or a non-EEA resident parse, so the rules (not a 400) turn them away', () => {
    expect(accepts({ birthYear: 2015 })).toBe(true);
    expect(accepts({ country: 'US' })).toBe(true);
  });

  it('rejects a country code that does not exist', () => {
    expect(accepts({ country: 'XX' })).toBe(false);
  });

  it('needs play days or "It varies", exactly one of them', () => {
    expect(accepts({ playDays: [], playVaries: true })).toBe(true);
    expect(accepts({ playDays: [], playVaries: false })).toBe(false);
    expect(accepts({ playDays: [Weekday.Mon], playVaries: true })).toBe(false);
    expect(accepts({ playDays: [Weekday.Mon, Weekday.Mon] })).toBe(false);
  });

  it('asks for a training week unless the user only wants food, and then forbids one', () => {
    const withoutWeek = Object.fromEntries(
      Object.entries(valid).filter(([key]) => key !== 'trainingWeek'),
    );
    expect(profileAnswersSchema.safeParse(withoutWeek).success).toBe(false);
    expect(profileAnswersSchema.safeParse({ ...withoutWeek, needs: Need.Food }).success).toBe(true);
    expect(accepts({ needs: Need.Food })).toBe(false);
  });

  it('rejects a training week whose available days are fewer than its sessions', () => {
    expect(
      accepts({
        trainingWeek: {
          sessionsPerWeek: 4,
          sessionMinutes: 45,
          availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
        },
      }),
    ).toBe(false);
  });

  it('names a typed sport, trimmed, and rejects an empty one', () => {
    const named = profileAnswersSchema.parse({
      ...valid,
      sport: { kind: SportKind.Other, name: '  Archery ' },
    });
    expect(named.sport).toEqual({ kind: SportKind.Other, name: 'Archery' });
    expect(accepts({ sport: { kind: SportKind.Other, name: '   ' } })).toBe(false);
  });

  it.each([
    ['a combining mark only', '\u0301'],
    ['combining marks only', '\u0301\u0302'],
    ['a zero-width space', '\u200b'],
    ['a zero-width space inside', 'Pad\u200bel'],
    ['a bidi override', 'Padel\u202e'],
    ['a newline', 'Beach\nTennis'],
    ['a tab', 'Beach\tTennis'],
    ['a hangul filler', '\u3164'],
    ['a name whose normalized form is too long', '\ufdfa'.repeat(8)],
  ])('rejects a typed sport that is %s', (_label, name) => {
    expect(accepts({ sport: { kind: SportKind.Other, name } })).toBe(false);
  });

  it('collapses the inner spaces of a typed sport and keeps accents and other scripts', () => {
    const parse = (name: string) =>
      profileAnswersSchema.parse({ ...valid, sport: { kind: SportKind.Other, name } }).sport;
    expect(parse(' Beach   Tennis ')).toEqual({ kind: SportKind.Other, name: 'Beach Tennis' });
    expect(parse('Ποδόσφαιρο')).toEqual({ kind: SportKind.Other, name: 'Ποδόσφαιρο' });
    expect(parse('Café\u00a0polo')).toEqual({ kind: SportKind.Other, name: 'Café polo' });
  });
});
