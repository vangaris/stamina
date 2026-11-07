/** Why the Unlock Meals setup was not saved. Nothing is stored for any of these. */
export enum SaveNutritionSetupRejection {
  /** The latest Screening turned Nutrition off. */
  NutritionOff = 'nutrition-off',
  /** A body direction was sent but the person's Goal is not body composition. */
  BodyDirectionNotAllowed = 'body-direction-not-allowed',
}
