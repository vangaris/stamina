/** A client-made Check-in id already belongs to another person's Check-in. */
export class CheckinIdTakenError extends Error {
  constructor() {
    super('The check-in id is already taken.');
    this.name = 'CheckinIdTakenError';
  }
}
