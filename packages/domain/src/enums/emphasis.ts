/** What a Block trains: one emphasis per Block, chosen from Goal, Sport Profile and season. */
export enum Emphasis {
  /** 4 to 6 reps at RIR 2 (before the week-in-Block adjustment). */
  Strength = 'strength',
  /** 3 to 5 fast reps, never closer than RIR 3; stop when the speed drops. */
  PowerSpeed = 'power-speed',
  /** 10 to 15 reps. */
  StrengthEndurance = 'strength-endurance',
}
