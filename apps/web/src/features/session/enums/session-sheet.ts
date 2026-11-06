/** The sheet open over the Session screen, if any; only one at a time. */
export enum SessionSheet {
  None = 'none',
  Swap = 'swap',
  /** Asks before finishing with sets still to do. */
  ConfirmFinish = 'confirm-finish',
}
