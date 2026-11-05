/** Why no Program was created. */
export enum ProgramRejection {
  /** No saved profile, or consent or Screening is still missing. */
  NotReady = 'not-ready',
  /** Screening referred the person and no Limited mode applies: no Program. */
  Referred = 'referred',
  /** The person chose food only, so there is no training week to plan. */
  NoTrainingWeek = 'no-training-week',
  /** The library cannot fill even a Recovery Session for their equipment and excluded areas. */
  NoExercises = 'no-exercises',
}
