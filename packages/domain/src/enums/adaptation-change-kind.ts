/** What accepting an Adaptation does to the Program. */
export enum AdaptationChangeKind {
  /** The Session moves to the day before or after. */
  MoveSession = 'move-session',
  /** A heavy Session becomes a Recovery Session on the same day. */
  SwapToRecovery = 'swap-to-recovery',
  /** One set fewer for every exercise that has more than one. */
  DropSet = 'drop-set',
  /** One rep more in reserve and one set fewer. */
  LightenSession = 'lighten-session',
  /** The exercises that load the targeted areas are replaced by ones that do not. */
  SwapExercises = 'swap-exercises',
  /** The week's unfinished Sessions take the Deload week's prescription. */
  DeloadWeek = 'deload-week',
  /** The week is generated again from tomorrow, at the same targets. */
  RepeatWeek = 'repeat-week',
  /** A new Block starts at week 1 from tomorrow, one rep more in reserve. */
  RestartBlock = 'restart-block',
}
