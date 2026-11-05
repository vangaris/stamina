/** How an exercise's sets, reps and effort read (`program.prescription.<key>`). */
export enum PrescriptionMessageKey {
  /** "3 x 4-6, stop with 3 in reserve" */
  RepsWithReserve = 'program.prescription.repsReserve',
  /** "1 x 8-10" */
  Reps = 'program.prescription.reps',
  /** "1 x 30-45 seconds" */
  Seconds = 'program.prescription.seconds',
}
