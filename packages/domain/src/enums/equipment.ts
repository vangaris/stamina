/**
 * Equipment an exercise needs beyond the body itself. An exercise with none listed is bodyweight.
 * Until a person says what they have, Stamina assumes dumbbells (`DEFAULT_EQUIPMENT`).
 */
export enum Equipment {
  Dumbbell = 'dumbbell',
  Barbell = 'barbell',
  Kettlebell = 'kettlebell',
  ResistanceBand = 'resistance-band',
  /** A weight machine or a cable stack. */
  Machine = 'machine',
  PullUpBar = 'pull-up-bar',
  Bench = 'bench',
  /** A plyometric box or any sturdy step. */
  Box = 'box',
  MedicineBall = 'medicine-ball',
  FoamRoller = 'foam-roller',
}
