/** Where a sport stands. Only `Approved` sports are shared with everyone. */
export enum SportStatus {
  /** Requested or drafted: visible only to the people who asked for it. */
  Draft = 'draft',
  /** Approved by the founder in the database table editor. */
  Approved = 'approved',
  Rejected = 'rejected',
}
