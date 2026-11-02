import { SportKind, type ProfileSubmission } from '@stamina/contracts';
import { Goal, Intensity, LaunchSport, Need, Units, Weekday } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import type { Db } from '../../src/db/types.ts';
import { invite } from '../../src/db/schema.ts';
import { generateInviteCode } from '../../src/invites/generate-invite-code.ts';

export const CURRENT_YEAR = new Date().getUTCFullYear();

/** A complete, eligible submission (adult in Greece, padel, three training sessions). */
export function validSubmission(overrides: Partial<ProfileSubmission> = {}): ProfileSubmission {
  return {
    needs: Need.Both,
    birthYear: CURRENT_YEAR - 30,
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
    inviteCode: 'ABCDEFGH23',
    ...overrides,
  };
}

/** Issues one unredeemed invite straight into the table, as the seed script does. */
export async function issueInvite(db: Db): Promise<string> {
  const code = generateInviteCode();
  await db.insert(invite).values({ code });
  return code;
}

/** The object without one key (for answers that are optional or must be absent). */
export function omit<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== key)) as Omit<T, K>;
}

/** A food-only submission: no training week. */
export function foodOnlySubmission(inviteCode: string): ProfileSubmission {
  return { ...omit(validSubmission(), 'trainingWeek'), needs: Need.Food, inviteCode };
}
