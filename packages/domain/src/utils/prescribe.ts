import {
  ACCESSORY_PRESCRIPTION,
  ACCESSORY_RIR_FLOOR,
  BLOCK_RIR_BY_WEEK,
  COOL_DOWN_PRESCRIPTION,
  DELOAD_SET_FACTOR,
  DELOAD_WEEK_IN_BLOCK,
  LIMITED_RIR_FLOOR,
  MAIN_STRENGTH_PRESCRIPTION,
  MAX_RIR,
  POWER_SPEED_RIR_FLOOR,
  SPORT_SUPPORT_PRESCRIPTION,
  SPORT_SUPPORT_RIR_FLOOR,
  WARM_UP_PRESCRIPTION,
} from '../config.ts';
import { Emphasis } from '../enums/emphasis.ts';
import { LoadGuidance } from '../enums/load-guidance.ts';
import { PrescriptionUnit } from '../enums/prescription-unit.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { PrescribeInput, Prescription } from '../types.ts';

/** Reps in reserve for a build or Deload week of a Block; weeks past the Block repeat its last. */
const weekRir = (weekInBlock: number): number =>
  BLOCK_RIR_BY_WEEK[Math.min(weekInBlock, BLOCK_RIR_BY_WEEK.length) - 1]!;

/**
 * Sets, reps and reps in reserve for one exercise. Week 1 carries no weights: effort is rated by
 * reps in reserve (`RpeGuided`), or the body is the load (`Bodyweight`). The Deload week halves
 * the sets (rounded up, at least one). Power and speed work and every Limited-mode exercise stay
 * at least 3 reps from failure (RPE 7 or easier); ballistic exercises carry no rating at all.
 * `rirBoost` adds reps in reserve to every rated exercise, never past `MAX_RIR`.
 */
export function prescribe({
  slot,
  emphasis,
  weekInBlock,
  limited,
  rirSuitable,
  needsEquipment,
  rirBoost = 0,
}: PrescribeInput): Prescription {
  const rated = slot !== SessionSlot.WarmUp && slot !== SessionSlot.CoolDown;
  const base = weekRir(weekInBlock);

  let range;
  let rir: number | null = null;
  switch (slot) {
    case SessionSlot.WarmUp:
      range = WARM_UP_PRESCRIPTION;
      break;
    case SessionSlot.CoolDown:
      range = COOL_DOWN_PRESCRIPTION;
      break;
    case SessionSlot.MainStrength:
      range = MAIN_STRENGTH_PRESCRIPTION[emphasis];
      rir = emphasis === Emphasis.PowerSpeed ? Math.max(base, POWER_SPEED_RIR_FLOOR) : base;
      break;
    case SessionSlot.SportSupport:
      range = SPORT_SUPPORT_PRESCRIPTION[emphasis];
      rir = Math.max(base, SPORT_SUPPORT_RIR_FLOOR);
      break;
    case SessionSlot.AccessoriesCore:
      range = ACCESSORY_PRESCRIPTION;
      rir = Math.max(base, ACCESSORY_RIR_FLOOR);
      break;
  }
  if (rir !== null && limited) rir = Math.max(rir, LIMITED_RIR_FLOOR);
  if (!rirSuitable) rir = null;
  if (rir !== null) rir = Math.min(MAX_RIR, rir + rirBoost);

  const sets =
    weekInBlock === DELOAD_WEEK_IN_BLOCK
      ? Math.max(1, Math.ceil(range.sets * DELOAD_SET_FACTOR))
      : range.sets;

  const loadGuidance = !rated
    ? LoadGuidance.None
    : !needsEquipment
      ? LoadGuidance.Bodyweight
      : rirSuitable
        ? LoadGuidance.RpeGuided
        : LoadGuidance.None;

  return {
    sets,
    repMin: range.repMin,
    repMax: range.repMax,
    unit: slot === SessionSlot.CoolDown ? PrescriptionUnit.Seconds : PrescriptionUnit.Reps,
    rir,
    loadGuidance,
  };
}
