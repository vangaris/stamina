/** Where a person is with Meals: not set up yet, switched off by the Screening, or ready. */
export enum NutritionStatus {
  /** The Unlock Meals setup is not saved yet. */
  Locked = 'locked',
  /** The latest Screening turned Nutrition off. */
  Off = 'off',
  Ready = 'ready',
}
