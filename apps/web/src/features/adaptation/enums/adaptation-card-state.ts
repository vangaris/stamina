/** Where one suggestion card stands. */
export enum AdaptationCardState {
  /** Waiting for the person to accept or keep their plan. */
  Pending = 'pending',
  /** A decision is being sent. */
  Busy = 'busy',
  /** Decided with no signal: on this device, sent when the person is back online. */
  Queued = 'queued',
}
