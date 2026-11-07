/** A meal log was refused: the latest Screening turned Nutrition off, so there are no meals to log. */
export class MealNutritionOffError extends Error {
  constructor() {
    super('Nutrition is off for this person.');
    this.name = 'MealNutritionOffError';
  }
}
