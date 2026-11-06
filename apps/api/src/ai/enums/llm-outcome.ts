/** What a logged call came to; the subset of `AiCallStatus` for calls that reached the provider. */
export enum LlmOutcome {
  Accepted = 'accepted',
  Rejected = 'rejected',
  Failed = 'failed',
}
