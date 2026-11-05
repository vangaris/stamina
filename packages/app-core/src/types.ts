import type {
  ApiClient,
  CreateProgramResult,
  ConsentGrant,
  ConsentState,
  InviteCheckResponse,
  ProfileAnswers,
  ProgramWeek,
  RecordDoctorOkResult,
  SavedProfile,
  SavedScreening,
  SaveProfileResult,
  SaveScreeningResult,
  ScreeningSubmission,
  UserExport,
} from '@stamina/contracts';
import type { ConsentPurpose, Weekday } from '@stamina/domain';
import type { z } from 'zod';
import type { HealthStateKind } from './enums/health-state-kind.ts';
import type { OfflinePolicy } from './enums/offline-policy.ts';
import type { ProfileStatus } from './enums/profile-status.ts';
import type { RequestOutcome } from './enums/request-outcome.ts';
import type { RequestType } from './enums/request-type.ts';
import type { SafetyStatus } from './enums/safety-status.ts';
import type { ServicesMode } from './enums/services-mode.ts';
import type { SessionStatus } from './enums/session-status.ts';

/** A command or query. `Result` is a phantom type: it never exists at runtime. */
export interface Request<Result = unknown> {
  readonly type: string;
  readonly __result?: Result;
}

export type ResultOf<R extends Request> = R extends Request<infer Result> ? Result : never;

export interface Context<Services, Stores> {
  services: Services;
  stores: Stores;
}

export type Handler<R extends Request, Services, Stores> = (
  request: R,
  context: Context<Services, Stores>,
) => Promise<ResultOf<R>>;

/**
 * Everything one request type needs, in one place. `schema` parses the request (its output is
 * what the handler receives, so it may normalise, e.g. trim); `offline` says what happens while
 * the device is offline.
 */
export interface RequestDefinition<R extends Request, Services, Stores> {
  schema: z.ZodType<R>;
  offline: OfflinePolicy;
  handler: Handler<R, Services, Stores>;
}

/** Definitions keyed by `Request.type`, with the request type erased (see `defineRequest`). */
export type RequestRegistry<Services, Stores> = Record<
  string,
  RequestDefinition<Request, Services, Stores>
>;

export interface Mediator {
  /** Resolves the handler's result, or `QUEUED_RESULT`; rejects only with an `AppError`. */
  send<R extends Request>(request: R): Promise<ResultOf<R>>;
}

/** What the pipeline steps read from the services; `Services` extends it. */
export interface PipelineServices {
  logger: Logger;
  clock: Clock;
  network: Network;
  offlineQueue: OfflineQueue;
}

export interface MediatorOptions<Services extends PipelineServices, Stores> {
  services: Services;
  stores: Stores;
  registry: RequestRegistry<Services, Stores>;
}

export interface PipelineContext {
  request: Request;
  definition: Pick<RequestDefinition<Request, unknown, unknown>, 'schema' | 'offline'>;
  services: PipelineServices;
  /** Milliseconds since the request entered the pipeline; 0 until the timing step runs. */
  elapsedMs: () => number;
}

/** Call `next` (optionally with a changed context) to continue; throw to abort. */
export type PipelineStep = (
  context: PipelineContext,
  next: (context: PipelineContext) => Promise<unknown>,
) => Promise<unknown>;

/** Resolved instead of the handler result when an offline request was put in the queue. */
export interface Queued {
  readonly queued: true;
}

/** The only things a log line may contain. Payloads (emails, codes, health data) never fit here. */
export interface LogEntry {
  requestType: string;
  outcome: RequestOutcome;
  durationMs: number;
}

export interface Logger {
  log(entry: LogEntry): void;
}

export interface Clock {
  /** Monotonic milliseconds. */
  now(): number;
}

export interface Network {
  isOnline(): boolean;
}

/** Holds offline requests until a later sync replays them. In memory now, IndexedDB later. */
export interface OfflineQueue {
  enqueue(request: Request): Promise<void>;
  pending(): Promise<readonly Request[]>;
}

export interface AuthSession {
  userId: string;
}

/** Email one-time-code and Google sign-in. Adapters throw `AuthError`. */
export interface AuthService {
  requestEmailCode(email: string): Promise<void>;
  /** Establishes the session on success. */
  verifyEmailCode(email: string, code: string): Promise<void>;
  /** Resolves where to send the browser to continue with Google. */
  startGoogleSignIn(callbackUrl: string): Promise<{ redirectUrl: string }>;
  /** Short-lived bearer token for the API; `undefined` when signed out. */
  getToken(): Promise<string | undefined>;
  getSession(): Promise<AuthSession | undefined>;
  signOut(): Promise<void>;
}

export interface BetterAuthServiceOptions {
  authUrl: string;
  fetch?: typeof fetch;
  /** Epoch milliseconds; compared with the token's `exp`. Tests inject it. */
  now?: () => number;
}

/**
 * Remembers the invite code the person already proved valid, across the sign-in redirect. A
 * code is not a secret worth protecting and says nothing about health, but it is still never logged.
 */
export interface InviteStorage {
  /** The remembered code in canonical form, or `undefined`. */
  get(): string | undefined;
  save(code: string): void;
  clear(): void;
}

export interface Services extends PipelineServices {
  api: ApiClient;
  auth: AuthService;
  inviteStorage: InviteStorage;
}

/** Test: silent in-memory mocks. Dev: in-memory mocks with a console logger. Production: real. */
export type ServicesEnv =
  | { mode: ServicesMode.Test }
  | { mode: ServicesMode.Dev }
  | { mode: ServicesMode.Production; apiBaseUrl: string; authUrl: string; fetch?: typeof fetch };

export type HealthState =
  | { kind: HealthStateKind.Ok }
  | { kind: HealthStateKind.Degraded }
  | { kind: HealthStateKind.Unreachable };

export type SessionState =
  | { status: SessionStatus.Unknown }
  | { status: SessionStatus.SignedOut }
  | { status: SessionStatus.SignedIn; userId: string };

export type ProfileState =
  | { status: ProfileStatus.Present; profile: SavedProfile }
  | { status: ProfileStatus.NotStarted }
  | { status: ProfileStatus.InviteNeeded };

export type SafetyState =
  | { status: SafetyStatus.ProfileNeeded }
  | {
      status: SafetyStatus.ConsentNeeded;
      /** The consents still to give, in the order the screen asks for them. */
      missing: ConsentPurpose[];
    }
  | { status: SafetyStatus.ScreeningNeeded }
  | { status: SafetyStatus.Referred; screening: SavedScreening }
  | { status: SafetyStatus.Ready; screening: SavedScreening };

export interface Stores {
  /** Stores hold state only; the web app backs these with Pinia. */
  health: { set(state: HealthState): void };
  session: { set(state: SessionState): void };
}

export interface AppMediatorOptions {
  services: Services;
  stores: Stores;
}

export interface GetHealth extends Request<HealthState> {
  readonly type: RequestType.GetHealth;
}

export interface RequestEmailCode extends Request<void> {
  readonly type: RequestType.RequestEmailCode;
  readonly email: string;
}

export interface VerifyEmailCode extends Request<SessionState> {
  readonly type: RequestType.VerifyEmailCode;
  readonly email: string;
  readonly code: string;
}

export interface StartGoogleSignIn extends Request<{ redirectUrl: string }> {
  readonly type: RequestType.StartGoogleSignIn;
  readonly callbackUrl: string;
}

export interface SignOut extends Request<void> {
  readonly type: RequestType.SignOut;
}

export interface GetSession extends Request<SessionState> {
  readonly type: RequestType.GetSession;
}

export interface CheckInvite extends Request<InviteCheckResponse> {
  readonly type: RequestType.CheckInvite;
  /** As typed or pasted; the handler normalises it. */
  readonly code: string;
}

export interface GetProfile extends Request<ProfileState> {
  readonly type: RequestType.GetProfile;
}

export interface SaveProfile extends Request<SaveProfileResult> {
  readonly type: RequestType.SaveProfile;
  readonly answers: ProfileAnswers;
}

export interface GetProgram extends Request<ProgramWeek | null> {
  readonly type: RequestType.GetProgram;
}

export interface CreateProgram extends Request<CreateProgramResult> {
  readonly type: RequestType.CreateProgram;
}

export interface GetSafety extends Request<SafetyState> {
  readonly type: RequestType.GetSafety;
}

export interface GrantConsent extends Request<ConsentState> {
  readonly type: RequestType.GrantConsent;
  readonly grant: ConsentGrant;
}

export interface SaveScreening extends Request<SaveScreeningResult> {
  readonly type: RequestType.SaveScreening;
  readonly submission: ScreeningSubmission;
}

export interface RecordDoctorOk extends Request<RecordDoctorOkResult> {
  readonly type: RequestType.RecordDoctorOk;
}

export interface ExportData extends Request<UserExport> {
  readonly type: RequestType.ExportData;
}

export interface DeleteAccount extends Request<void> {
  readonly type: RequestType.DeleteAccount;
}

export interface FakeProgramInput {
  sessionsPerWeek: number;
  sessionMinutes: number;
  availableDays: readonly Weekday[];
  /** Limited mode: RIR never below `limitedMinRir`, no sport-support slot, flagged on the block. */
  limited: boolean;
  /** Generation time; the week starts the next UTC day. */
  now: Date;
}
