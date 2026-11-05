import { RULES_VERSION, type GenerateWeekInput } from '@stamina/domain';
import { canonicalJson } from './canonical-json.ts';

const sorted = <T extends string>(values: readonly T[]): T[] => [...values].sort();

/**
 * SHA-256 (64 hex characters) of the engine's inputs, so a stored Session can say exactly what
 * made it. Only what the rules read goes in: the profile fields they use, the Sport Profile used,
 * the Training mode and the ids of excluded areas, equipment, library and the week asked for.
 * Never a Screening answer; the mode and the excluded-area ids are all that is derived from them.
 * Lists that the rules treat as sets are sorted first. Web Crypto, so it runs on Workers too.
 */
export async function hashInputs(input: GenerateWeekInput): Promise<string> {
  const canonical = canonicalJson({
    rulesVersion: RULES_VERSION,
    goal: input.goal,
    playDays: sorted(input.playDays),
    playVaries: input.playVaries,
    playIntensity: input.playIntensity,
    trainingWeek: {
      sessionsPerWeek: input.trainingWeek.sessionsPerWeek,
      sessionMinutes: input.trainingWeek.sessionMinutes,
      availableDays: sorted(input.trainingWeek.availableDays),
    },
    sport: input.sport,
    mode: input.mode,
    excludedAreas: sorted(input.excludedAreas),
    equipment: sorted(input.equipment),
    libraryIds: sorted(input.library.map((exercise) => exercise.id)),
    weekInBlock: input.weekInBlock,
    startsOn: input.startsOn,
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
