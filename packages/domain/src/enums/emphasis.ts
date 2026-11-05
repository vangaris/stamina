/**
 * What a Block trains: one emphasis per Block, chosen from Goal, Sport Profile and season. It sets
 * the sets and reps; the week in the Block sets the effort (reps in reserve 3, 2, 1, then 4 in the Deload).
 */
export enum Emphasis {
  /** 4 to 6 reps. */
  Strength = 'strength',
  /** 3 to 5 fast reps, never closer than RIR 3; stop when the speed drops. */
  PowerSpeed = 'power-speed',
  /** 10 to 15 reps. */
  StrengthEndurance = 'strength-endurance',
}
