/** How a person finds the weight for an exercise: Stamina never asks for a 1RM test. */
export enum LoadGuidance {
  /** "A weight you could lift N more times", N coming from the target RIR. */
  RpeGuided = 'rpe-guided',
  Bodyweight = 'bodyweight',
  /** Mobility and warm-up work with nothing to load. */
  None = 'none',
}
