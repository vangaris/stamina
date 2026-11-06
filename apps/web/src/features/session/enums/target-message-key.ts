/** How an exercise's target reads in Focus mode (`session.target.<key>`). */
export enum TargetMessageKey {
  /** "3 x 4-6 reps" */
  Reps = 'session.target.reps',
  /** "1 x 30-45 seconds" */
  Seconds = 'session.target.seconds',
  /** "Stop with 3 reps in reserve (RPE 7)" */
  Effort = 'session.target.effort',
  /** "Start with 42.5 kg." (no word on how it was reached) */
  SuggestedStart = 'session.target.suggested.start',
  /** "Start with 42.5 kg. You reached the top of the range last time, so this is a little heavier." */
  SuggestedIncrease = 'session.target.suggested.increase',
  SuggestedDecrease = 'session.target.suggested.decrease',
  SuggestedHold = 'session.target.suggested.hold',
}
