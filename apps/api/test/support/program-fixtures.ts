import {
  ApiPath,
  HttpMethod,
  SportKind,
  createProgramResultSchema,
  exerciseListResponseSchema,
  programResponseSchema,
  type Exercise,
  type ProfileSubmission,
  type ProgramWeek,
} from '@stamina/contracts';
import {
  BodyArea,
  Goal,
  Intensity,
  LaunchSport,
  ScreeningQuestion,
  SportStatus,
  Weekday,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { sport } from '../../src/db/schema.ts';
import {
  consentToBoth,
  newUser,
  screeningSubmission,
  type FixtureUser,
  type TestApi,
} from './safety-fixtures.ts';
import { foodOnlySubmission, issueInvite, validSubmission } from './profile-fixtures.ts';

/** A Thursday: a Program generated now starts on the Friday, 2026-11-06. */
export const PROGRAM_NOW = new Date('2026-11-05T10:00:00.000Z');
export const PROGRAM_STARTS_ON = '2026-11-06';
/** The seven dates of the week that starts on `PROGRAM_STARTS_ON`, with their weekdays. */
export const PROGRAM_WEEK: readonly { date: string; weekday: Weekday }[] = [
  { date: '2026-11-06', weekday: Weekday.Fri },
  { date: '2026-11-07', weekday: Weekday.Sat },
  { date: '2026-11-08', weekday: Weekday.Sun },
  { date: '2026-11-09', weekday: Weekday.Mon },
  { date: '2026-11-10', weekday: Weekday.Tue },
  { date: '2026-11-11', weekday: Weekday.Wed },
  { date: '2026-11-12', weekday: Weekday.Thu },
];
export const ALL_DAYS = Object.values(Weekday);
export const MON_TO_SAT = [
  Weekday.Mon,
  Weekday.Tue,
  Weekday.Wed,
  Weekday.Thu,
  Weekday.Fri,
  Weekday.Sat,
];

type TrainingWeek = NonNullable<ProfileSubmission['trainingWeek']>;
const trainingWeek = (
  sessionsPerWeek: number,
  sessionMinutes: number,
  availableDays: Weekday[],
): { trainingWeek: TrainingWeek } => ({
  trainingWeek: { sessionsPerWeek, sessionMinutes, availableDays },
});

/** Padel on Tuesday and Friday, played hard; three 45-minute Sessions on any day but Sunday. */
export const padelPersona = (minutes = 45): Partial<ProfileSubmission> => ({
  sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
  playDays: [Weekday.Tue, Weekday.Fri],
  playVaries: false,
  playIntensity: Intensity.Hard,
  goal: Goal.SportPerformance,
  ...trainingWeek(3, minutes, MON_TO_SAT),
});

/** Basketball with two games a week; two 30-minute Sessions. */
export const basketballPersona: Partial<ProfileSubmission> = {
  sport: { kind: SportKind.Launch, sport: LaunchSport.Basketball },
  playDays: [Weekday.Wed, Weekday.Sat],
  playVaries: false,
  playIntensity: Intensity.Hard,
  goal: Goal.SportPerformance,
  ...trainingWeek(2, 30, ALL_DAYS),
};

/** A kitesurfer whose days depend on the wind: no known play days; four 60-minute Sessions. */
export const kitesurferPersona: Partial<ProfileSubmission> = {
  sport: { kind: SportKind.Launch, sport: LaunchSport.Kitesurfing },
  playDays: [],
  playVaries: true,
  playIntensity: Intensity.Hard,
  goal: Goal.SportPerformance,
  ...trainingWeek(4, 60, ALL_DAYS),
};

export interface ProgramUserOptions {
  submission?: Partial<ProfileSubmission>;
  /** Food only: no training week, so no Program. */
  foodOnly?: boolean;
  /** Screening questions answered yes (default none: cleared). */
  yes?: readonly ScreeningQuestion[];
  /** Areas to keep exercises away from (answers yes to the bone, joint or muscle question). */
  excludedAreas?: readonly BodyArea[];
  /** The person states "a doctor has said I can train" after a referral. */
  doctorOk?: boolean;
  /** Skip the profile, the consents or the Screening, to be not ready. */
  skip?: 'profile' | 'consent' | 'screening';
}

/** Onboards a fresh user through the API as far as `options` says, and returns them. */
export async function programUser(
  api: TestApi,
  {
    submission = {},
    foodOnly = false,
    yes = [],
    excludedAreas,
    doctorOk = false,
    skip,
  }: ProgramUserOptions = {},
): Promise<FixtureUser> {
  const user = await newUser(api);
  if (skip === 'profile') return user;
  const inviteCode = await issueInvite(api.db);
  const answers = foodOnly
    ? foodOnlySubmission(inviteCode)
    : validSubmission({ ...submission, inviteCode });
  const saved = await user.call(HttpMethod.Post, ApiPath.Profile, answers);
  if (saved.status !== 200) throw new Error(`profile failed: ${saved.status}`);
  if (skip === 'consent') return user;
  await consentToBoth(user);
  if (skip === 'screening') return user;

  const questions = excludedAreas === undefined ? yes : [...yes, ScreeningQuestion.BoneJointMuscle];
  const screened = await user.call(
    HttpMethod.Post,
    ApiPath.Screening,
    screeningSubmission(
      questions,
      excludedAreas === undefined ? {} : { bodyAreas: [...excludedAreas] },
    ),
  );
  if (screened.status !== 200) throw new Error(`screening failed: ${screened.status}`);
  if (doctorOk) {
    const stated = await user.call(HttpMethod.Post, ApiPath.DoctorOk);
    if (stated.status !== 200) throw new Error(`doctor ok failed: ${stated.status}`);
  }
  return user;
}

/** Calls `POST /program` and parses the answer with its status. */
export async function postProgram(user: FixtureUser) {
  const response = await user.call(HttpMethod.Post, ApiPath.Program);
  return {
    status: response.status,
    result: createProgramResultSchema.parse(await response.json()),
  };
}

/** Calls `GET /program`. */
export async function getProgram(user: FixtureUser): Promise<ProgramWeek | null> {
  const response = await user.call(HttpMethod.Get, ApiPath.Program);
  if (response.status !== 200) throw new Error(`get program failed: ${response.status}`);
  return programResponseSchema.parse(await response.json()).program;
}

/** The library as the API lists it, by id. */
export async function libraryById(user: FixtureUser): Promise<Map<string, Exercise>> {
  const response = await user.call(HttpMethod.Get, ApiPath.Exercises);
  const { exercises } = exerciseListResponseSchema.parse(await response.json());
  return new Map(exercises.map((exercise) => [exercise.id, exercise]));
}

/** Approves a launch sport in the test database, optionally replacing parts of its profile. */
export async function approveSport(
  api: TestApi,
  id: LaunchSport,
  changes: (
    profile: NonNullable<typeof sport.$inferSelect.profile>,
  ) => typeof sport.$inferSelect.profile = (profile) => profile,
) {
  const [row] = await api.db.select().from(sport).where(eq(sport.id, id));
  await api.db
    .update(sport)
    .set({
      status: SportStatus.Approved,
      profile: changes(row!.profile!),
      approvedBy: 'Vang',
      approvedAt: new Date(),
    })
    .where(eq(sport.id, id));
}
