/** What the pipeline does with a request while the device is offline. */
export enum OfflinePolicy {
  /** Reject with `AppErrorCode.Offline`. */
  Never = 'never',
  /** Store in the `OfflineQueue` and resolve `QUEUED_RESULT`. */
  Queue = 'queue',
  /** Run anyway; the handler copes with the failure itself. */
  Always = 'always',
}
