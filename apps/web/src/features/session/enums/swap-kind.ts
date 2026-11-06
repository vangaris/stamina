/** The exercises a swap can pick; the values are the i18n keys' last part (`session.swap.<value>`). */
export enum SwapKind {
  Easier = 'easier',
  Harder = 'harder',
  /** Back to the exercise the Session planned. */
  Original = 'original',
}
