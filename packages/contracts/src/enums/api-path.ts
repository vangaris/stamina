/** Paths of the API, shared by the typed client and the server's routes. */
export enum ApiPath {
  Health = '/health',
  Me = '/me',
  /** The signed-in user's data as JSON. */
  MeExport = '/me/export',
  Profile = '/profile',
  InviteCheck = '/invites/check',
  /** The curated exercise library, filtered by the query string. */
  Exercises = '/exercises',
  /** The sports the signed-in user may see: approved ones, plus their own requests. */
  Sports = '/sports',
  /** What the signed-in user has consented to and their latest Screening. */
  Safety = '/safety',
  Consent = '/consent',
  Screening = '/screening',
  /** "A doctor has said I can train", after a referral. */
  DoctorOk = '/screening/doctor-ok',
  /** The signed-in user's Program: `GET` reads the week, `POST` creates it if there is none. */
  Program = '/program',
  /** One Session: `GET /sessions/{id}`, `POST /sessions/{id}/sets`, `POST /sessions/{id}/finish`. */
  Sessions = '/sessions',
  /** Activities: `POST /activities` logs one, `GET /activities/week` reads this week's Load. */
  Activities = '/activities',
}
