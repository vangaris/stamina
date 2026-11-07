import {
  ApiError,
  DatabaseStatus,
  DoctorOkRejection,
  HealthStatus,
  HttpStatus,
  ProfileRejection,
  profileRejectionFor,
  RecordStatus,
  SaveNutritionSetupStatus,
  SaveProfileStatus,
  ScreeningRejection,
  type RecheckScreening,
  SportKind,
  ProgramRejection,
  type Adaptation,
  type ProgramWeek,
  type SavedProfile,
  type SavedScreening,
  type SaveScreeningResult,
  type ScreeningSubmission,
  type UserExport,
} from '@stamina/contracts';
import {
  CONSENT_TEXT_VERSIONS,
  ConsentPurpose,
  checkEligibility,
  evaluateScreening,
  Goal,
  isGoalAvailable,
  isHotDefaultSport,
  ScreeningQuestion,
  normalizeSportName,
  normalizeInviteCode,
  ReferralKind,
  ScreeningStatus,
  resolveTrainingMode,
  TrainingMode,
  type LoadEntry,
  summariseProgress,
} from '@stamina/domain';
import { FAKE_AUTH, FAKE_INVITE, FAKE_KEY_SEPARATOR, HTTP_UNAUTHORIZED } from '../config.ts';
import { buildFakeProgram } from '../utils/build-fake-program.ts';
import { toHardActivityDates } from '../utils/to-hard-activity-dates.ts';
import { createFakeAdaptations, type FakeAdaptationContext } from './create-fake-adaptations.ts';
import { createFakeActivityLog, type FakeActivityContext } from './create-fake-activity-log.ts';
import { createFakeCheckins } from './create-fake-checkins.ts';
import { createFakeNutrition, type FakeNutritionContext } from './create-fake-nutrition.ts';
import { createFakeWeighIns } from './create-fake-weigh-ins.ts';
import { createFakeSessionLog, type FakeSessionTarget } from './create-fake-session-log.ts';
import { createFakeStopFlags } from './create-fake-stop-flags.ts';
import type { FakeApiClient, FakeWeek } from '../types.ts';

type StoredConsent = UserExport['consents'][number];

/** A Screening as the fake keeps it: the saved outcome plus the answers the export returns. */
interface StoredScreening {
  submission: ScreeningSubmission;
  outcome: ReturnType<typeof evaluateScreening>;
  takenAt: string;
  doctorOkAt: string | null;
}

/** The latest Screening's answers with the asked-again ones replaced; areas follow the bone, joint and muscle answer, and the starting level carries over. */
function mergeRecheck(
  previous: ScreeningSubmission,
  recheck: RecheckScreening,
): ScreeningSubmission {
  const answers = { ...previous.answers, ...recheck.answers };
  const askedAreas = recheck.answers[ScreeningQuestion.BoneJointMuscle] !== undefined;
  return {
    answers,
    bodyAreas: askedAreas ? [...(recheck.bodyAreas ?? [])] : previous.bodyAreas,
    startingLevel: previous.startingLevel,
  };
}

/**
 * In-memory stand-in for the API, with the same rules: healthy; `me` answers from the fake auth
 * token; invites and profiles behave like the server's (eligibility first, an existing profile
 * updates without the invite, otherwise the invite is redeemed once and the profile created).
 * Consents and Screenings follow the server's rules too: no Screening without a saved profile or
 * both consents (checked in that order), the latest Screening wins, Nutrition off turns a
 * body-composition Goal into General fitness,
 * and the doctor statement works for a general referral only. Sessions come from the user's fake
 * week; their sets and finish follow the server's replay rules (see `createFakeSessionLog`).
 */
export function createFakeApiClient(getToken: () => Promise<string | undefined>): FakeApiClient {
  const profiles = new Map<string, SavedProfile>();
  const redeemed = new Set<string>();
  const consents = new Map<string, StoredConsent[]>();
  const screenings = new Map<string, StoredScreening[]>();
  /** Per user: the "Other" sport asked for (the fake has no approvals). */
  const sportRequests = new Map<string, UserExport['sportRequests'][number]>();
  const programs = new Map<string, FakeWeek>();
  /** A Session id a revision replaced, and the id of its current row: the old id still opens the Session, like the server's. */
  const supersededBy = new Map<string, string>();
  const readProgram = (userId: string): ProgramWeek | null => {
    const week = programs.get(userId);
    const profile = profiles.get(userId);
    return week && profile
      ? { ...week, hardActivityDates: toHardActivityDates(week.block.startsOn, profile) }
      : null;
  };

  const sessionLog = createFakeSessionLog();
  /** The user's Session with this id, or `ApiError` 404 like the server for anyone else's. */
  const sessionTarget = async (sessionId: string): Promise<FakeSessionTarget> => {
    const userId = await requireUserId();
    const week = programs.get(userId);
    let currentId = sessionId;
    while (supersededBy.has(currentId)) currentId = supersededBy.get(currentId)!;
    const session = week?.sessions.find(({ id }) => id === currentId);
    if (!week || !session) throw new ApiError(HttpStatus.NotFound);
    return {
      key: `${userId}${FAKE_KEY_SEPARATOR}${currentId}`,
      session,
      emphasis: week.block.emphasis,
    };
  };

  const adaptations = createFakeAdaptations();
  const adaptationContext = async (): Promise<FakeAdaptationContext> => {
    const userId = await requireUserId();
    const week = programs.get(userId);
    return {
      userId,
      today: new Date().toISOString().slice(0, 10),
      week,
      isUntouched: (sessionId) => {
        const session = week?.sessions.find(({ id }) => id === sessionId);
        if (!week || !session) return false;
        const key = `${userId}${FAKE_KEY_SEPARATOR}${sessionId}`;
        const detail = sessionLog.read({ key, session, emphasis: week.block.emphasis });
        return (
          detail.finished === null &&
          detail.exercises.every(({ loggedSets }) => loggedSets.length === 0)
        );
      },
      program: () => readProgram(userId),
      commit: (revised, superseded) => {
        programs.set(userId, revised);
        for (const [old, current] of superseded) supersededBy.set(old, current);
      },
    };
  };

  const checkins = createFakeCheckins();
  const stopFlags = createFakeStopFlags();

  const activityLog = createFakeActivityLog();
  /** Weeks run from the first Block's start, else from today (the fake keeps no sign-up date). */
  const activityContext = async (): Promise<FakeActivityContext> => {
    const userId = await requireUserId();
    const today = new Date().toISOString().slice(0, 10);
    return {
      userId,
      anchor: programs.get(userId)?.block.startsOn ?? today,
      today,
      profile: profiles.get(userId),
    };
  };
  /** The user's finished Sessions as Load on the Session's date. */
  const finishedSessionEntries = (userId: string): LoadEntry[] =>
    (programs.get(userId)?.sessions ?? []).flatMap((session) => {
      const finished = sessionLog.finished(`${userId}${FAKE_KEY_SEPARATOR}${session.id}`);
      return finished ? [{ date: session.date, load: finished.load }] : [];
    });

  const weighIns = createFakeWeighIns();

  const nutrition = createFakeNutrition();
  const nutritionContext = async (): Promise<FakeNutritionContext> => {
    const context = await activityContext();
    const { userId } = context;
    return {
      userId,
      today: context.today,
      anchor: context.anchor,
      profile: profiles.get(userId),
      nutritionOff: latestScreening(userId)?.outcome.nutritionOff ?? false,
      sessions: programs.get(userId)?.sessions ?? [],
      activities: activityLog.all(userId),
      weighIns: weighIns.all(userId),
    };
  };

  const grantedPurposes = (userId: string) =>
    (consents.get(userId) ?? [])
      .filter(
        ({ purpose, textVersion, withdrawnAt }) =>
          withdrawnAt === null && textVersion === CONSENT_TEXT_VERSIONS[purpose],
      )
      .map(({ purpose }) => purpose);

  const latestScreening = (userId: string) => screenings.get(userId)?.at(-1);

  const toSaved = ({
    submission,
    outcome,
    takenAt,
    doctorOkAt,
  }: StoredScreening): SavedScreening => ({
    status: outcome.status,
    referral: outcome.referral,
    nutritionOff: outcome.nutritionOff,
    excludedAreas: [...outcome.excludedAreas],
    startingLevel: submission.startingLevel,
    trainingMode: resolveTrainingMode({
      status: outcome.status,
      referral: outcome.referral,
      doctorOk: doctorOkAt !== null,
    }),
    takenAt,
    doctorOkAt,
  });

  /** Why no Screening is accepted from the user now (no saved profile, then no consent), or `undefined`. */
  const screeningRejectionFor = (userId: string) => {
    if (!profiles.has(userId)) return ScreeningRejection.ProfileMissing;
    const granted = grantedPurposes(userId);
    if (!Object.values(ConsentPurpose).every((purpose) => granted.includes(purpose))) {
      return ScreeningRejection.ConsentMissing;
    }
    return undefined;
  };

  /** The one place a Screening is evaluated and kept: a Nutrition-off outcome also moves a body-composition Goal to General fitness. */
  const storeScreening = (userId: string, submission: ScreeningSubmission): SaveScreeningResult => {
    const outcome = evaluateScreening(submission);
    const stored: StoredScreening = {
      submission,
      outcome,
      takenAt: new Date().toISOString(),
      doctorOkAt: null,
    };
    screenings.set(userId, [...(screenings.get(userId) ?? []), stored]);
    const profile = profiles.get(userId);
    const goalChanged = !!profile && !isGoalAvailable(profile.goal, outcome);
    if (profile && goalChanged) profiles.set(userId, { ...profile, goal: Goal.GeneralFitness });
    return { status: RecordStatus.Saved, screening: toSaved(stored), goalChanged };
  };

  const requireUserId = async () => {
    const token = await getToken();
    if (!token?.startsWith(FAKE_AUTH.tokenPrefix)) throw new ApiError(HTTP_UNAUTHORIZED);
    return token.slice(FAKE_AUTH.tokenPrefix.length);
  };

  const isUsable = (input: string) => {
    const code = normalizeInviteCode(input);
    return code === FAKE_INVITE.validCode && !redeemed.has(code);
  };

  return {
    seedAdaptation: async (adaptation: Adaptation) =>
      adaptations.seed(await requireUserId(), adaptation),
    health: async () => ({ status: HealthStatus.Ok, database: DatabaseStatus.Up }),
    me: async () => ({ userId: await requireUserId() }),
    checkInvite: async (code) => ({ valid: isUsable(code) }),
    getProfile: async () => profiles.get(await requireUserId()) ?? null,
    saveProfile: async ({ inviteCode, ...answers }) => {
      const userId = await requireUserId();
      const eligibility = checkEligibility({
        birthYear: answers.birthYear,
        country: answers.country,
        // UTC, like the server, so both agree on the year around New Year.
        currentYear: new Date().getUTCFullYear(),
      });
      const rejection = profileRejectionFor(eligibility);
      if (rejection) return { status: SaveProfileStatus.Rejected, reason: rejection };
      const nutritionOff = latestScreening(userId)?.outcome.nutritionOff ?? false;
      if (!isGoalAvailable(answers.goal, { nutritionOff })) {
        return { status: SaveProfileStatus.Rejected, reason: ProfileRejection.GoalUnavailable };
      }
      if (!profiles.has(userId)) {
        if (!isUsable(inviteCode)) {
          return { status: SaveProfileStatus.Rejected, reason: ProfileRejection.InviteInvalid };
        }
        redeemed.add(FAKE_INVITE.validCode);
      }
      const profile: SavedProfile = {
        ...answers,
        hotConditionsDefault:
          answers.sport.kind === SportKind.Launch && isHotDefaultSport(answers.sport.sport),
      };
      profiles.set(userId, profile);
      // The fake keeps the one sport the person asked for: a rename gives the earlier request up,
      // as the server does when nobody else asked for it.
      if (answers.sport.kind === SportKind.Other) {
        const sportId = normalizeSportName(answers.sport.name);
        const earlier = sportRequests.get(userId);
        if (earlier?.sportId !== sportId) {
          sportRequests.set(userId, {
            sportId,
            name: answers.sport.name,
            requestedAt: new Date().toISOString(),
          });
        }
      } else {
        sportRequests.delete(userId);
      }
      return { status: SaveProfileStatus.Saved, profile };
    },
    getSafety: async () => {
      const userId = await requireUserId();
      const latest = latestScreening(userId);
      return {
        profileSaved: profiles.has(userId),
        granted: grantedPurposes(userId),
        screening: latest ? toSaved(latest) : null,
        stop: stopFlags.state(userId),
      };
    },
    grantConsent: async ({ purpose, locale }) => {
      const userId = await requireUserId();
      if (!grantedPurposes(userId).includes(purpose)) {
        consents.set(userId, [
          ...(consents.get(userId) ?? []),
          {
            purpose,
            textVersion: CONSENT_TEXT_VERSIONS[purpose],
            locale,
            grantedAt: new Date().toISOString(),
            withdrawnAt: null,
          },
        ]);
      }
      return { granted: grantedPurposes(userId) };
    },
    saveScreening: async (submission) => {
      const userId = await requireUserId();
      const rejection = screeningRejectionFor(userId);
      if (rejection) return { status: RecordStatus.Rejected, reason: rejection };
      return storeScreening(userId, submission);
    },
    recheckScreening: async (recheck) => {
      const userId = await requireUserId();
      const rejection = screeningRejectionFor(userId);
      if (rejection) return { status: RecordStatus.Rejected, reason: rejection };
      const latest = latestScreening(userId);
      if (!latest) {
        return { status: RecordStatus.Rejected, reason: ScreeningRejection.NoScreening };
      }
      return storeScreening(userId, mergeRecheck(latest.submission, recheck));
    },
    submitCheckin: async (checkin) => checkins.submit(await requireUserId(), checkin),
    getLatestCheckin: async () => checkins.latest(await requireUserId()),
    reportStopFlag: async (report) => stopFlags.report(await requireUserId(), report),
    confirmDoctorSeen: async (confirm) => stopFlags.confirm(await requireUserId(), confirm),
    recordDoctorOk: async () => {
      const latest = latestScreening(await requireUserId());
      if (!latest || latest.outcome.status !== ScreeningStatus.Referred) {
        return { status: RecordStatus.Rejected, reason: DoctorOkRejection.NotReferred };
      }
      if (latest.outcome.referral === ReferralKind.Pregnancy) {
        return { status: RecordStatus.Rejected, reason: DoctorOkRejection.Pregnancy };
      }
      latest.doctorOkAt ??= new Date().toISOString();
      return { status: RecordStatus.Saved, screening: toSaved(latest) };
    },
    exportData: async () => {
      const userId = await requireUserId();
      return {
        exportedAt: new Date().toISOString(),
        profile: profiles.get(userId) ?? null,
        program: readProgram(userId),
        setLogs: [],
        sessionLogs: [],
        activities: activityLog.all(userId),
        checkins: checkins.all(userId),
        stopFlags: stopFlags.all(userId),
        weighIns: weighIns.all(userId),
        nutritionSetup: nutrition.setup(userId),
        waterLogs: nutrition.allWater(userId),
        consents: [...(consents.get(userId) ?? [])],
        sportRequests: sportRequests.has(userId) ? [sportRequests.get(userId)!] : [],
        adaptations: adaptations.all(userId),
        screenings: (screenings.get(userId) ?? []).map((stored) => ({
          ...toSaved(stored),
          answers: { ...stored.submission.answers },
        })),
      };
    },
    deleteAccount: async () => {
      const userId = await requireUserId();
      profiles.delete(userId);
      consents.delete(userId);
      screenings.delete(userId);
      sportRequests.delete(userId);
      programs.delete(userId);
      sessionLog.forget(`${userId}${FAKE_KEY_SEPARATOR}`);
      activityLog.forget(userId);
      checkins.forget(userId);
      stopFlags.forget(userId);
      adaptations.forget(userId);
      weighIns.forget(userId);
      nutrition.forget(userId);
    },
    getProgram: async () => readProgram(await requireUserId()),
    getSession: async (sessionId) => sessionLog.read(await sessionTarget(sessionId)),
    logSet: async (sessionId, set) => sessionLog.logSet(await sessionTarget(sessionId), set),
    finishSession: async (sessionId, finish) =>
      sessionLog.finish(await sessionTarget(sessionId), finish),
    logActivity: async (activity) => activityLog.log(await activityContext(), activity),
    getWeekLoad: async () => {
      const context = await activityContext();
      return activityLog.week(context, finishedSessionEntries(context.userId));
    },
    getProgress: async () => {
      const context = await activityContext();
      const week = programs.get(context.userId);
      const summary = summariseProgress({
        anchor: context.anchor,
        today: context.today,
        entries: [
          ...finishedSessionEntries(context.userId),
          ...activityLog.all(context.userId).map(({ date, load }): LoadEntry => ({ date, load })),
        ],
        sessions: (week?.sessions ?? []).map(({ id, date, minutes }) => ({
          date,
          weekInBlock: week!.block.weekInBlock,
          minutes,
          finished:
            sessionLog.finished(`${context.userId}${FAKE_KEY_SEPARATOR}${id}`) !== undefined,
        })),
        activities: activityLog.all(context.userId),
        play: context.profile,
      });
      return { ...summary, weighIn: weighIns.status(context.userId, summary.weekStartsOn) };
    },
    logWeighIn: async (entry) => {
      const userId = await requireUserId();
      const result = weighIns.log(userId, new Date().toISOString().slice(0, 10), entry);
      nutrition.rebase(userId, result.weightKg, result.date, weighIns.all(userId));
      return result;
    },
    getNutrition: async (date) => nutrition.read(await nutritionContext(), date),
    saveNutritionSetup: async (setup) => {
      const { userId, today } = await nutritionContext();
      const basisKg = nutrition.setup(userId)?.weightKg;
      const rejected = nutrition.save(await nutritionContext(), setup);
      if (rejected) return rejected;
      if (basisKg !== setup.weightKg) weighIns.log(userId, today, { weightKg: setup.weightKg });
      return {
        status: SaveNutritionSetupStatus.Saved,
        nutrition: nutrition.read(await nutritionContext(), today),
      };
    },
    logWater: async (water) => nutrition.logWater(await nutritionContext(), water),
    getAdaptations: async () => ({ adaptations: adaptations.pending(await adaptationContext()) }),
    acceptAdaptation: async (id, accept) =>
      adaptations.accept(await adaptationContext(), id, accept),
    declineAdaptation: async (id) => adaptations.decline(await requireUserId(), id),
    createProgram: async () => {
      const userId = await requireUserId();
      const existing = readProgram(userId);
      if (existing) return { status: RecordStatus.Saved, program: existing };
      const profile = profiles.get(userId);
      const latest = latestScreening(userId);
      const granted = grantedPurposes(userId);
      const consented = Object.values(ConsentPurpose).every((purpose) => granted.includes(purpose));
      if (!profile || !latest || !consented) {
        return { status: RecordStatus.Rejected, reason: ProgramRejection.NotReady };
      }
      const { trainingMode } = toSaved(latest);
      if (trainingMode === TrainingMode.Referred) {
        return { status: RecordStatus.Rejected, reason: ProgramRejection.Referred };
      }
      if (stopFlags.state(userId).pausing.length > 0) {
        return { status: RecordStatus.Rejected, reason: ProgramRejection.Paused };
      }
      if (!profile.trainingWeek) {
        return { status: RecordStatus.Rejected, reason: ProgramRejection.NoTrainingWeek };
      }
      const program = buildFakeProgram({
        ...profile.trainingWeek,
        limited: trainingMode === TrainingMode.Limited,
        now: new Date(),
      });
      programs.set(userId, program);
      return { status: RecordStatus.Saved, program: readProgram(userId)! };
    },
  };
}
