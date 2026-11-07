/** How a count of done against planned is worded: the last part of its i18n key. */
export enum ProgressCountWording {
  /** "1 of 3 done". */
  OfPlanned = 'value',
  /** Nothing planned, so only what is done is said. */
  Unplanned = 'valueUnplanned',
  /** More done than planned: never "3 of 2". */
  Over = 'valueOver',
}
