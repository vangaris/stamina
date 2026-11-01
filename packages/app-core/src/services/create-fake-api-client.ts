import {
  ApiError,
  DatabaseStatus,
  HealthStatus,
  ProfileRejection,
  SaveProfileStatus,
  SportKind,
  type ApiClient,
  type SavedProfile,
} from '@stamina/contracts';
import {
  checkEligibility,
  Eligibility,
  isHotDefaultSport,
  normalizeInviteCode,
} from '@stamina/domain';
import { FAKE_AUTH, FAKE_INVITE, HTTP_UNAUTHORIZED } from '../config.ts';

const REJECTION_FOR_ELIGIBILITY = {
  [Eligibility.UnderAge]: ProfileRejection.UnderAge,
  [Eligibility.OutsideEea]: ProfileRejection.OutsideEea,
} as const;

/**
 * In-memory stand-in for the API, with the same rules: healthy; `me` answers from the fake auth
 * token; invites and profiles behave like the server's (eligibility first, an existing profile
 * updates without the invite, otherwise the invite is redeemed once and the profile created).
 */
export function createFakeApiClient(getToken: () => Promise<string | undefined>): ApiClient {
  const profiles = new Map<string, SavedProfile>();
  const redeemed = new Set<string>();

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
        currentYear: new Date().getFullYear(),
      });
      if (eligibility !== Eligibility.Eligible) {
        return {
          status: SaveProfileStatus.Rejected,
          reason: REJECTION_FOR_ELIGIBILITY[eligibility],
        };
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
  };
}
