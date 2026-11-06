/** How far a Session has got, as the week view's card shows it; the values are the i18n keys' last part (`program.session.action.<value>`). */
export enum SessionProgress {
  NotStarted = 'not-started',
  /** Some sets are logged. */
  InProgress = 'in-progress',
  Done = 'done',
}
