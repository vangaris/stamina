/** The parts of an Adaptation's path after its id. */
export enum AdaptationSubpath {
  /** `POST` accepts the suggestion: the Program changes. */
  Accept = 'accept',
  /** `POST` declines it ("Keep my plan"): nothing changes. */
  Decline = 'decline',
}
