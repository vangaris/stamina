/** A client-made Activity id already belongs to another person's Activity. */
export class ActivityIdTakenError extends Error {
  constructor() {
    super('The activity id is already taken.');
    this.name = 'ActivityIdTakenError';
  }
}
