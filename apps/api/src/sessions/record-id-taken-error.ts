/** A client-made id (of a set or a finish) already belongs to a record outside this Session. */
export class RecordIdTakenError extends Error {
  constructor() {
    super('The record id is already taken.');
    this.name = 'RecordIdTakenError';
  }
}
