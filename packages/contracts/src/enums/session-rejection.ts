/** Why a set or a finish was not recorded. Nothing is stored for any of these. */
export enum SessionRejection {
  /** The exercise is neither one of the Session's exercises nor its tagged easier or harder variant. */
  ExerciseNotInSession = 'exercise-not-in-session',
  /** The Session was finished already; no more sets can be logged. */
  SessionFinished = 'session-finished',
}
