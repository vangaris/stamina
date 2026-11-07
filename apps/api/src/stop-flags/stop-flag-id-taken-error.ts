/** A client-made stop flag id already belongs to another person's stop flag. */
export class StopFlagIdTakenError extends Error {
  constructor() {
    super('The stop flag id is already taken.');
    this.name = 'StopFlagIdTakenError';
  }
}
