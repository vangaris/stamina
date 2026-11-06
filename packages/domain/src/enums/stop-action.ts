/** What a stop flag does to training. */
export enum StopAction {
  /** Training stops until the person confirms a doctor has seen them. */
  PauseUntilDoctor = 'pause-until-doctor',
  /** Training stops until the person confirms a doctor has cleared them. */
  PauseUntilCleared = 'pause-until-cleared',
  /** No training on the day it was reported. */
  RestToday = 'rest-today',
  /** Exercises that load the reported body area are left out from now on. */
  ExcludeArea = 'exclude-area',
}
