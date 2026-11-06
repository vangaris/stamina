/** The parts of a Session's path after its id. */
export enum SessionSubpath {
  /** `POST` one logged set. */
  Sets = 'sets',
  /** `POST` the finish with the session RPE. */
  Finish = 'finish',
}
