import { AppErrorCode } from './enums/app-error-code.ts';
import { AuthErrorCode } from './enums/auth-error-code.ts';
import { BetterAuthErrorCode } from './enums/better-auth-error-code.ts';
import type { Queued } from './types.ts';

export const QUEUED_RESULT: Queued = Object.freeze({ queued: true });

/** Digits in an emailed code (Better Auth's Email OTP default). */
export const OTP_LENGTH = 6;

export const APP_ERROR_FOR_AUTH_ERROR: Record<AuthErrorCode, AppErrorCode> = {
  [AuthErrorCode.InvalidCode]: AppErrorCode.InvalidCode,
  [AuthErrorCode.CodeExpired]: AppErrorCode.CodeExpired,
  [AuthErrorCode.TooManyAttempts]: AppErrorCode.TooManyAttempts,
  [AuthErrorCode.Network]: AppErrorCode.Offline,
  [AuthErrorCode.Unknown]: AppErrorCode.Unknown,
};

export const AUTH_ERROR_FOR_BETTER_AUTH_CODE: Record<BetterAuthErrorCode, AuthErrorCode> = {
  [BetterAuthErrorCode.InvalidOtp]: AuthErrorCode.InvalidCode,
  [BetterAuthErrorCode.OtpExpired]: AuthErrorCode.CodeExpired,
  [BetterAuthErrorCode.TooManyAttempts]: AuthErrorCode.TooManyAttempts,
};

export const HTTP_UNAUTHORIZED = 401;

export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/** The fake `AuthService` (Test and Dev modes). */
export const FAKE_AUTH = {
  validCode: '424242',
  /** The Nth wrong code for one email throws `TooManyAttempts`; a new code request resets it. */
  maxWrongCodes: 3,
  /** The fake API reads the user id from this token, like the real API reads `sub`. */
  tokenPrefix: 'fake-jwt:',
} as const;

/** A cached API token is dropped this long before its `exp`, so it never expires in flight. */
export const TOKEN_EXPIRY_MARGIN_MS = 30_000;

/** Where the browser keeps the checked invite code while the person signs in (it may leave the app for Google and come back). */
export const INVITE_STORAGE_KEY = 'stamina.invite-code';

/**
 * Invite codes the fake API (Test and Dev modes) knows, in canonical form. The valid one can be
 * redeemed once per fake API; the used one never can.
 */
export const FAKE_INVITE = {
  validCode: 'KWDMX7PQ4R',
  usedCode: 'UBSED2HT5V',
} as const;

/** The week the fake API returns for the Program: not real rules, just enough to render. */
export const FAKE_PROGRAM = {
  /** 64 hex characters, like the server's inputs hash. */
  inputsHash: 'f'.repeat(64),
  rulesVersion: 1,
  weekInBlock: 1,
  /** The Session id is this prefix plus the Session's number padded to `idDigits`. */
  idPrefix: '00000000-0000-4000-8000-',
  idDigits: 12,
  /** Reps in reserve for build week 1, and the least the fake uses for a Limited user (RPE 7). */
  weekRir: 3,
  limitedMinRir: 3,
  mainSets: 4,
  mainReps: { min: 4, max: 6 },
  supportReps: { min: 5, max: 8 },
  accessorySets: 3,
  accessoryReps: { min: 8, max: 12 },
  warmUpReps: { min: 8, max: 10 },
  coolDownSeconds: { min: 30, max: 45 },
} as const;

/** Exercise names the fake plan draws from, per Session focus (library ids and names). */
export const FAKE_PROGRAM_EXERCISES = {
  warmUp: { exerciseId: 'fake-warm-up', name: { en: 'Easy jog on the spot', el: null } },
  coolDown: { exerciseId: 'fake-cool-down', name: { en: 'Standing hamstring stretch', el: null } },
  lower: {
    main: [
      { exerciseId: 'fake-goblet-squat', name: { en: 'Goblet squat', el: 'Καθίσματα goblet' } },
      { exerciseId: 'fake-romanian-deadlift', name: { en: 'Romanian deadlift', el: null } },
    ],
    support: { exerciseId: 'fake-split-squat', name: { en: 'Split squat', el: null } },
    accessory: { exerciseId: 'fake-glute-bridge', name: { en: 'Glute bridge', el: null } },
  },
  upper: {
    main: [
      { exerciseId: 'fake-dumbbell-press', name: { en: 'Dumbbell bench press', el: null } },
      { exerciseId: 'fake-one-arm-row', name: { en: 'One-arm dumbbell row', el: null } },
    ],
    support: { exerciseId: 'fake-push-up', name: { en: 'Push-up', el: null } },
    accessory: { exerciseId: 'fake-dead-bug', name: { en: 'Dead bug', el: null } },
  },
} as const;
