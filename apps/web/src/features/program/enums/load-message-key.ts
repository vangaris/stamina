/** How the weight is chosen (`program.load.<key>`); no line at all where there is nothing to load. */
export enum LoadMessageKey {
  /** "A weight you could lift N more times" */
  RpeGuided = 'program.load.rpeGuided',
  Bodyweight = 'program.load.bodyweight',
}
