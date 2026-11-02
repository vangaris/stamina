/** Outcome of a call that stores something: `200` with `Saved`, or `422` with `Rejected`. */
export enum RecordStatus {
  Saved = 'saved',
  Rejected = 'rejected',
}
