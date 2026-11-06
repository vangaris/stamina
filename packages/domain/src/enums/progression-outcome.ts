/** What the next Session does with an exercise's weight after the last one was logged. */
export enum ProgressionOutcome {
  /** Every set reached the top of the rep range at or below the target effort: add weight. */
  Increase = 'increase',
  /** At least two sets were two or more RPE points above the target: take 5 % off. */
  Decrease = 'decrease',
  /** Reps were missed, or the sets were neither clearly easy nor clearly too hard: same weight. */
  Hold = 'hold',
}
