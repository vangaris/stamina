/** A client-made meal log id already belongs to another person's meal log. */
export class MealIdTakenError extends Error {
  constructor() {
    super('The meal log id is already taken.');
    this.name = 'MealIdTakenError';
  }
}
