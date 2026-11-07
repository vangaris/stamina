import type { GenerateWeekInput, GenerationBasis } from '@stamina/domain';

/** What generated the Program, without the week asked for: `generateWeek` over it plus a day gives any later week. */
export function toGenerationBasis({
  goal,
  playDays,
  playVaries,
  playIntensity,
  trainingWeek,
  sport,
  mode,
  excludedAreas,
  equipment,
  library,
}: GenerateWeekInput): GenerationBasis {
  return {
    goal,
    playDays,
    playVaries,
    playIntensity,
    trainingWeek,
    sport,
    mode,
    excludedAreas,
    equipment,
    library,
  };
}
