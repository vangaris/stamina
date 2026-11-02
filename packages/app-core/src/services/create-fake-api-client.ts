import {
  ApiError,
  DatabaseStatus,
  DoctorOkRejection,
  HealthStatus,
  ProfileRejection,
  profileRejectionFor,
  RecordStatus,
  SaveProfileStatus,
  ScreeningRejection,
  SportKind,
  type ApiClient,
  type SavedProfile,
  type SavedScreening,
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
  normalizeInviteCode,
  ReferralKind,
  ScreeningStatus,
  resolveTrainingMode,
} from '@stamina/domain';
import { FAKE_AUTH, FAKE_INVITE, HTTP_UNAUTHORIZED } from '../config.ts';

type StoredConsent = UserExport['consents'][number];

/** A Screening as the fake keeps it: the saved outcome plus the answers the export returns. */
interface StoredScreening {
  submission: ScreeningSubmission;
  outcome: ReturnType<typeof evaluateScreening>;
  takenAt: string;
  doctorOkAt: string | null;
}

/**
 * In-memory stand-in for the API, with the same rules: healthy; `me` answers from the fake auth
 * token; invites and profiles behave like the server's (eligibility first, an existing profile
 * updates without the invite, otherwise the invite is redeemed once and the profile created).
 * Consents and Screenings follow the server's rules too: no Screening without a saved profile or
 * both consents (checked in that order), the latest Screening wins, Nutrition off turns a
 * body-composition Goal into General fitness,
 * and the doctor statement works for a general referral only.
 */
export function createFakeApiClient(getToken: () => Promise<string | undefined>): ApiClient {
  const profiles = new Map<string, SavedProfile>();
  const redeemed = new Set<string>();
  const consents = new Map<string, StoredConsent[]>();
  const screenings = new Map<string, StoredScreening[]>();

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
      return { status: SaveProfileStatus.Saved, profile };
    },
    getSafety: async () => {
      const userId = await requireUserId();
      const latest = latestScreening(userId);
      return {
        profileSaved: profiles.has(userId),
        granted: grantedPurposes(userId),
        screening: latest ? toSaved(latest) : null,
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
      if (!profiles.has(userId)) {
        return { status: RecordStatus.Rejected, reason: ScreeningRejection.ProfileMissing };
      }
      const granted = grantedPurposes(userId);
      if (!Object.values(ConsentPurpose).every((purpose) => granted.includes(purpose))) {
        return { status: RecordStatus.Rejected, reason: ScreeningRejection.ConsentMissing };
      }
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
    },
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
        consents: [...(consents.get(userId) ?? [])],
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
    },
  };
}
