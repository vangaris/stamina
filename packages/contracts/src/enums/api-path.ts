/** Paths of the API, shared by the typed client and the server's routes. */
export enum ApiPath {
  Health = '/health',
  Me = '/me',
  /** The signed-in user's data as JSON. */
  MeExport = '/me/export',
  Profile = '/profile',
  InviteCheck = '/invites/check',
  /** What the signed-in user has consented to and their latest Screening. */
  Safety = '/safety',
  Consent = '/consent',
  Screening = '/screening',
  /** "A doctor has said I can train", after a referral. */
  DoctorOk = '/screening/doctor-ok',
}
