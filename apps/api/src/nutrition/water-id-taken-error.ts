/** A client-made water log id already belongs to another person's water log. */
export class WaterIdTakenError extends Error {
  constructor() {
    super('The water log id is already taken.');
    this.name = 'WaterIdTakenError';
  }
}
