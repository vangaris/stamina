/** Why a profile was not saved. Nothing is stored for any of these. */
export enum ProfileRejection {
  UnderAge = 'under-18',
  OutsideEea = 'outside-eea',
  /** Unknown, malformed or already used: one answer, so codes cannot be probed. */
  InviteInvalid = 'invite-invalid',
  /** The body-composition Goal while Screening has turned Nutrition off. */
  GoalUnavailable = 'goal-unavailable',
}
