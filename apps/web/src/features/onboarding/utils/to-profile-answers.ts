import { profileAnswersSchema, SportKind, type ProfileAnswers } from '@stamina/contracts';
import { Need, type Weekday } from '@stamina/domain';
import { WEEKDAYS } from '../config.ts';
import type { OnboardingDraft } from '../types.ts';

const inWeekOrder = (days: readonly Weekday[]) => WEEKDAYS.filter((day) => days.includes(day));

/**
 * What is sent: the draft as the contract's answers, days in week order, no training week for
 * food only. The contract's own schema has the last word, so anything the screens let through
 * that the server would refuse comes back as `undefined` here instead.
 */
export function toProfileAnswers(draft: OnboardingDraft): ProfileAnswers | undefined {
  const wantsTraining = draft.needs !== Need.Food;
  const candidate = {
    needs: draft.needs,
    birthYear: Number(draft.birthYear),
    country: draft.country,
    sport:
      draft.sport === SportKind.Other
        ? { kind: SportKind.Other, name: draft.otherSportName.trim() }
        : { kind: SportKind.Launch, sport: draft.sport },
    playDays: draft.playVaries ? [] : inWeekOrder(draft.playDays),
    playVaries: draft.playVaries,
    playMinutes: draft.playMinutes,
    playIntensity: draft.playIntensity,
    goal: draft.goal,
    ...(wantsTraining && {
      trainingWeek: {
        sessionsPerWeek: draft.sessionsPerWeek,
        sessionMinutes: draft.sessionMinutes,
        availableDays: inWeekOrder(draft.availableDays),
      },
    }),
    locale: draft.locale,
    units: draft.units,
  };
  const parsed = profileAnswersSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}
