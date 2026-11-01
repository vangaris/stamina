import { profileAnswersSchema, SportKind, type ProfileAnswers } from '@stamina/contracts';
import { Need } from '@stamina/domain';
import type { OnboardingDraft } from '../types.ts';

/**
 * What is sent: the draft as the contract's answers, no training week for food only. The contract's own schema has the last word, so anything the screens let through
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
    playDays: draft.playVaries ? [] : draft.playDays,
    playVaries: draft.playVaries,
    playMinutes: draft.playMinutes,
    playIntensity: draft.playIntensity,
    goal: draft.goal,
    ...(wantsTraining && {
      trainingWeek: {
        sessionsPerWeek: draft.sessionsPerWeek,
        sessionMinutes: draft.sessionMinutes,
        availableDays: draft.availableDays,
      },
    }),
    locale: draft.locale,
    units: draft.units,
  };
  const parsed = profileAnswersSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}
