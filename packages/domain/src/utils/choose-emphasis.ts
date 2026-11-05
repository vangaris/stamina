import { POWER_SPEED_MIN_POWER_SHARE, STRENGTH_ENDURANCE_MIN_AEROBIC_SHARE } from '../config.ts';
import { Emphasis } from '../enums/emphasis.ts';
import { Goal } from '../enums/goal.ts';
import { SeasonKind } from '../enums/season-kind.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import type { EmphasisInput, SportDemands } from '../types.ts';

const inSeason = ({ season }: SportDemands, month: number): boolean =>
  season.kind === SeasonKind.YearRound || season.months.includes(month);

/** What a SportPerformance Goal trains: the sport's energy mix decides, and out of season builds a base. */
function emphasisForSport(sport: SportDemands | null, month: number): Emphasis {
  if (sport === null || !inSeason(sport, month)) return Emphasis.Strength;
  const { aerobic, repeatedSprint, explosive } = sport.energyMix;
  if (explosive + repeatedSprint >= POWER_SPEED_MIN_POWER_SHARE) return Emphasis.PowerSpeed;
  if (aerobic >= STRENGTH_ENDURANCE_MIN_AEROBIC_SHARE) return Emphasis.StrengthEndurance;
  return Emphasis.Strength;
}

/**
 * What a Block trains. Strength and Body composition Goals build Strength, General fitness builds
 * Strength endurance, and a SportPerformance Goal follows the sport's energy mix while the sport
 * is in season (and builds Strength out of season, or while there is no Sport Profile). Limited
 * mode never plans power work, so Power and speed becomes Strength.
 */
export function chooseEmphasis({ goal, sport, mode, month }: EmphasisInput): Emphasis {
  const emphasis =
    goal === Goal.GeneralFitness
      ? Emphasis.StrengthEndurance
      : goal === Goal.SportPerformance
        ? emphasisForSport(sport, month)
        : Emphasis.Strength;
  return mode === TrainingMode.Limited && emphasis === Emphasis.PowerSpeed
    ? Emphasis.Strength
    : emphasis;
}
