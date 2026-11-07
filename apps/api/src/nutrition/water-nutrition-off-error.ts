/** A water log was refused: the latest Screening turned Nutrition off, so there is no hydration target to log toward. */
export class WaterNutritionOffError extends Error {
  constructor() {
    super('Nutrition is off for this person.');
    this.name = 'WaterNutritionOffError';
  }
}
