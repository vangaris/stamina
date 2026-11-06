/** How one call through the AI gateway ended, from the caller's side: only `Accepted` carries a result. */
export enum AiCallStatus {
  Accepted = 'accepted',
  /** The model answered but the caller's check refused the answer. */
  Rejected = 'rejected',
  /** The provider errored or returned something unusable. */
  Failed = 'failed',
  /** No provider is configured (Phase A). Nothing was called or logged. */
  Unavailable = 'unavailable',
  /** The person already made their daily calls. Nothing was called or logged. */
  UserCapReached = 'user-cap-reached',
  /** The month's spend reached the kill-switch share of the cap. Nothing was called or logged. */
  KillSwitch = 'kill-switch',
}
