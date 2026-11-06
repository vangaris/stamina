/** Why a set of picked exercises is refused (`validatePicks`). */
export enum PickProblem {
  /** An exercise that is not a candidate of the slot it was picked for, or a slot the Session does not have. */
  NotACandidate = 'not-a-candidate',
  /** A slot got more or fewer exercises than the Session needs there. */
  WrongCount = 'wrong-count',
  /** One exercise appears twice in the Session. */
  Duplicate = 'duplicate',
}
