import { AppErrorCode } from './enums/app-error-code.ts';
import { AuthErrorCode } from './enums/auth-error-code.ts';
import { BetterAuthErrorCode } from './enums/better-auth-error-code.ts';
import { LocalTable } from './enums/local-table.ts';
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

/** What the Test mode clock reads: monotonic time stands still at 0 and the wall clock at this ISO moment, so a test sees the same times every run. */
export const TEST_CLOCK = { nowMs: 0, wallTime: '2026-11-06T09:00:00.000Z' } as const;

export const HTTP_UNAUTHORIZED = 401;

export const HTTP_REQUEST_TIMEOUT = 408;

export const HTTP_TOO_MANY_REQUESTS = 429;

/** The 4xx statuses: the server read the request and said no. */
export const HTTP_CLIENT_ERROR = { min: 400, max: 499 } as const;

/** 4xx answers that say nothing about the request itself (no or expired token, timeout, rate limit): sending it again later can work. */
export const RETRYABLE_CLIENT_STATUSES: readonly number[] = [
  HTTP_UNAUTHORIZED,
  HTTP_REQUEST_TIMEOUT,
  HTTP_TOO_MANY_REQUESTS,
];

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
    limitedAccessory: { exerciseId: 'fake-side-plank', name: { en: 'Side plank', el: null } },
  },
  upper: {
    main: [
      { exerciseId: 'fake-dumbbell-press', name: { en: 'Dumbbell bench press', el: null } },
      { exerciseId: 'fake-one-arm-row', name: { en: 'One-arm dumbbell row', el: null } },
    ],
    support: { exerciseId: 'fake-push-up', name: { en: 'Push-up', el: null } },
    accessory: { exerciseId: 'fake-dead-bug', name: { en: 'Dead bug', el: null } },
    limitedAccessory: { exerciseId: 'fake-bird-dog', name: { en: 'Bird dog', el: null } },
  },
} as const;

/** The IndexedDB database: its name and Dexie schema (the primary key first, then indexed fields). */
export const LOCAL_DATABASE = {
  name: 'stamina',
  version: 3,
  schema: {
    [LocalTable.Queue]: '++id',
    [LocalTable.Sets]: 'id, sessionId',
    [LocalTable.Finishes]: 'sessionId',
    [LocalTable.Activities]: 'id',
    [LocalTable.Cache]: 'key',
    [LocalTable.Owner]: 'key',
  },
} as const;

/** The key of the one row in the owner table: the id of the user the local data belongs to. */
export const OWNER_KEY = 'owner';

/** Keys in the cache table: the one Program week, the one week's Load, and one Session detail per Session id. */
export const CACHE_KEY = {
  program: 'program',
  clearedScreening: 'cleared-screening',
  weekLoad: 'week-load',
  sessionDetailPrefix: 'session:',
} as const;

/** Joins a user id and a Session id into the key the fake API keeps that Session's sets and finish under. */
export const FAKE_KEY_SEPARATOR = ':';

/** What the fake API adds to the fake Program to make Sessions the Session screen can run. */
export const FAKE_SESSION = {
  /** A Session exercise's id: this prefix plus its number padded to `FAKE_PROGRAM.idDigits`. */
  exerciseIdPrefix: '00000000-0000-4000-8001-',
  /** Room for this many exercises per Session in the number above. */
  exercisesPerSession: 100,
  /** Variants of an RPE-guided exercise: its id plus the suffix, and its English name plus the suffix (the swap sheet adds the "Easier:" / "Harder:" label itself). */
  easier: { idSuffix: '-easier', nameSuffix: ' (supported)' },
  harder: { idSuffix: '-harder', nameSuffix: ' (loaded)' },
} as const;
