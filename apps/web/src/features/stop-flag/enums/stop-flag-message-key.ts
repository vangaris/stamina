/** i18n keys the stop-flag composables hand to their screens; the components translate them. */
export enum StopFlagMessageKey {
  ReportQueued = 'stopFlag.status.queued',
  ReportFailed = 'stopFlag.status.failed',
  AnswerRequired = 'stopFlag.errors.answer',
  AreasRequired = 'stopFlag.errors.areas',
  RecheckOffline = 'stopFlag.errors.offline',
  RecheckUnknown = 'stopFlag.errors.unknown',
  PausedConfirm = 'stopFlag.paused.confirm',
  PausedConfirmCleared = 'stopFlag.paused.confirmCleared',
  PausedHint = 'stopFlag.paused.hint',
  PausedHintCleared = 'stopFlag.paused.hintCleared',
  PausedStillSaving = 'stopFlag.paused.errors.stillSaving',
  PausedOffline = 'stopFlag.paused.errors.offline',
  PausedUnknown = 'stopFlag.paused.errors.unknown',
}
