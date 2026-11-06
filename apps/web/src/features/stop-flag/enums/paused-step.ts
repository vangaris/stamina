/** The steps of the paused screen. */
export enum PausedStep {
  /** What pauses training, and the one button that ends the pause. */
  Confirm = 'confirm',
  /** The questions a report asked again that the person has not answered yet. */
  Recheck = 'recheck',
}
