/** i18n keys of what the weigh-in says after a try; the components translate them. */
export enum WeighInMessageKey {
  Saved = 'progress.weighIn.saved',
  /** The weight is not a number between the lowest and highest weight accepted. */
  Invalid = 'progress.weighIn.errors.invalid',
  /** A weigh-in needs a connection; it is not kept on the phone to send later. */
  Offline = 'progress.weighIn.errors.offline',
  Failed = 'progress.weighIn.errors.failed',
}
