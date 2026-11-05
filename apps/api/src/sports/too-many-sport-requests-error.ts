/** The person already has the most requests on sports that are not approved yet. */
export class TooManySportRequestsError extends Error {
  constructor() {
    super('Too many sport requests.');
    this.name = 'TooManySportRequestsError';
  }
}
