import type {
  AcceptAdaptationResult,
  Adaptation,
  DeclineAdaptationResult,
  ApiClient,
  Checkin,
  ConfirmDoctorSeenResult,
  CreateProgramResult,
  ConsentGrant,
  ConsentState,
  FinishSession as FinishSessionBody,
  FinishSessionResult,
  InviteCheckResponse,
  LogActivity as LogActivityBody,
  LogActivityResult,
  LogSet as LogSetBody,
  LogSetResult,
  LogWater as LogWaterBody,
  LogWaterResult,
  LogWeighIn as LogWeighInBody,
  LogWeighInResult,
  NutritionSetup,
  NutritionState,
  ProfileAnswers,
  Progress,
  ProgramWeek,
  RecheckScreening as RecheckScreeningBody,
  RecordDoctorOkResult,
  ReportStopFlag as ReportStopFlagBody,
  ReportStopFlagResult,
  SavedProfile,
  SavedScreening,
  SaveNutritionSetupResult,
  SaveProfileResult,
  SaveScreeningResult,
  ScreeningSubmission,
  SessionDetail,
  SubmitCheckin as SubmitCheckinBody,
  SubmitCheckinResult,
  UserExport,
  WeekLoad,
} from '@stamina/contracts';
import type { ConsentPurpose, StopFlag, StopState, Weekday } from '@stamina/domain';
import type { DexieOptions } from 'dexie';
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
  /** Replays the offline queue now (the mediator's own single-flight runner); for a handler that must not leave requests behind. */
  sync: SyncRunner;
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
  /**
   * Local-first: runs right after validation, online or offline, before the request is queued or
   * handled, so what the person did is on the device whatever happens next. It must be idempotent
   * (a request may be sent again). The handler does not run offline and a replay skips this hook,
   * which is why the write cannot live in the handler.
   */
  writeLocal?(request: R, services: Services): Promise<void>;
  /**
   * Takes back what `writeLocal` wrote, when the server refused the request for good (a
   * permanent client error, see `isRetryableFailure`): online by the offline queue step, and by
   * the sync runner when it drops a queued entry. Without it a refused set or finish would stay on
   * the device and show as logged. Must be idempotent. For an entry that no longer parses against
   * its schema the runner passes the request as it was queued and ignores a failure.
   */
  undoLocal?(request: R, services: Services): Promise<void>;
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
  definition: Pick<
    RequestDefinition<Request, unknown, unknown>,
    'schema' | 'offline' | 'writeLocal' | 'undoLocal'
  >;
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
  /** The wall-clock time, for what is stored or shown as a moment (it can jump when the person changes the device clock). */
  wallTime(): Date;
}

export interface Network {
  isOnline(): boolean;
}

/** A request waiting in the `OfflineQueue`; `id` is the queue's own key, ascending in insertion order. */
export interface QueuedRequest {
  id: number;
  request: Request;
}

/**
 * Holds requests until a sync replays them: IndexedDB in production (survives a reload), memory
 * in Test and Dev. Requests are plain serialisable objects.
 */
export interface OfflineQueue {
  enqueue(request: Request): Promise<void>;
  /** Everything not yet removed, oldest first. */
  pending(): Promise<readonly QueuedRequest[]>;
  /** Drops an entry once it was replayed; an unknown id does nothing. */
  remove(id: number): Promise<void>;
}

/** A finish as the device recorded it: the finish body plus when (ISO), so the Session can show it as finished before the server confirms. */
export interface LocalFinish {
  finish: FinishSessionBody;
  recordedAt: string;
}

/** What this device logged for one Session. */
export interface LocalSessionLog {
  /** In no particular order; the Session screen sorts by set number. */
  sets: readonly LogSetBody[];
  finish: LocalFinish | null;
}

/**
 * What the person logged on this device, written before anything is sent (see
 * `RequestDefinition.writeLocal`) so the Session screen shows it offline. Rows stay after the
 * server has them: reading merges by id, so a stale row is harmless; only a set the server
 * refused is removed.
 */
export interface SessionLogStore {
  /** Idempotent by the set's id. */
  addSet(sessionId: string, set: LogSetBody): Promise<void>;
  removeSet(setId: string): Promise<void>;
  /** A Session finishes once: a later call for the same Session keeps the first. */
  recordFinish(sessionId: string, finish: LocalFinish): Promise<void>;
  /** Removes the Session's finish only when it is the one with this id, so a refused second finish cannot take back the first. */
  removeFinish(sessionId: string, finishId: string): Promise<void>;
  read(sessionId: string): Promise<LocalSessionLog>;
}

/** An Activity as the device recorded it: the body plus when (ISO), so the week shows it before the server confirms. */
export interface LocalActivity {
  activity: LogActivityBody;
  recordedAt: string;
}

/**
 * The Activities the person logged on this device, written before anything is sent (see
 * `RequestDefinition.writeLocal`) so the week shows them offline. Rows stay after the server has
 * them: merging is by id, so a stale row is harmless; only an Activity the server refused is removed.
 */
export interface ActivityLogStore {
  /** Idempotent by the Activity's id: the first `recordedAt` stays. */
  add(activity: LogActivityBody, recordedAt: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** In no particular order. */
  list(): Promise<readonly LocalActivity[]>;
}

/** A water log as the device recorded it: the body plus when (ISO), so the day's water counts it before the server confirms. */
export interface LocalWater {
  water: LogWaterBody;
  recordedAt: string;
}

/**
 * The water logs the person made on this device, written before anything is sent (see
 * `RequestDefinition.writeLocal`) so the water bar counts them offline. A row stays until the
 * server has the log (the handler removes it: the server's day total carries no ids to merge by,
 * so a row left behind would count twice) or refused it; `GetNutrition` adds what is left to the
 * day's water.
 */
export interface WaterLogStore {
  /** Idempotent by the log's id: the first `recordedAt` stays. */
  add(water: LogWaterBody, recordedAt: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** In no particular order. */
  list(): Promise<readonly LocalWater[]>;
}

/** A stop flag as the device recorded it: the report plus when (ISO), so the pause holds before the server confirms. */
export interface LocalStopFlag {
  report: ReportStopFlagBody;
  reportedAt: string;
}

/**
 * The stop flags the person reported on this device, written before anything is sent (see
 * `RequestDefinition.writeLocal`) so the pause holds offline. A row stays until the server has the
 * flag (the report's handler removes it) or refused it; `GetSafety` merges what is left into the
 * stop state.
 */
export interface StopFlagStore {
  /** Idempotent by the report's id: the first `reportedAt` stays. */
  add(flag: ReportStopFlagBody, reportedAt: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** In no particular order. */
  list(): Promise<readonly LocalStopFlag[]>;
}

/** A Check-in as the device recorded it: the body plus when (ISO), so it reads as the latest before the server confirms. */
export interface LocalCheckin {
  checkin: SubmitCheckinBody;
  recordedAt: string;
}

/**
 * The Check-ins the person submitted on this device, written before anything is sent (see
 * `RequestDefinition.writeLocal`). Rows stay after the server has them: reading merges by
 * recency, so a stale row is harmless; only a Check-in the server refused is removed.
 */
export interface CheckinStore {
  /** Idempotent by the Check-in's id: the first `recordedAt` stays. */
  add(checkin: SubmitCheckinBody, recordedAt: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** The latest by day, then by `recordedAt`; null when none is kept. */
  latest(): Promise<LocalCheckin | null>;
}

/**
 * The last plan and Session detail fetched, so the week and an opened Session work without
 * signal, and the Screening of a person last found cleared to train (see `getSafetyDefinition`).
 */
export interface PlanCache {
  saveProgram(program: ProgramWeek): Promise<void>;
  readProgram(): Promise<ProgramWeek | undefined>;
  saveSessionDetail(detail: SessionDetail): Promise<void>;
  readSessionDetail(sessionId: string): Promise<SessionDetail | undefined>;
  saveWeekLoad(week: WeekLoad): Promise<void>;
  /** The week's Load as last fetched; undefined when none is kept, or when what is stored is malformed. */
  readWeekLoad(): Promise<WeekLoad | undefined>;
  saveProgress(progress: Progress): Promise<void>;
  /** The Progress as last fetched; undefined when none is kept, or when what is stored is malformed. */
  readProgress(): Promise<Progress | undefined>;
  /** Meals for `date` (`YYYY-MM-DD`) as last fetched; only the latest fetch is kept. */
  saveNutrition(date: string, nutrition: NutritionState): Promise<void>;
  /** Undefined when none is kept for that date, or when what is stored is malformed. */
  readNutrition(date: string): Promise<NutritionState | undefined>;
  /** Only ever a Screening that is not `Referred`: the one safety fact trusted offline. */
  saveClearedScreening(screening: SavedScreening): Promise<void>;
  /** Undefined when none is kept, or when what is stored is malformed or `Referred`. */
  readClearedScreening(): Promise<SavedScreening | undefined>;
  /** Drops the cached stop state with it: the two are kept and lost together. */
  deleteClearedScreening(): Promise<void>;
  /** The stop state as the server last reported it; read with the cleared Screening, so a pause holds offline. */
  saveStop(stop: StopState): Promise<void>;
  /** Undefined when none is kept, or when what is stored is malformed. */
  readStop(): Promise<StopState | undefined>;
  /** Drops one cached Session detail (its Session was superseded by a revision); nothing for an unknown id. */
  deleteSessionDetail(sessionId: string): Promise<void>;
  /** The pending Adaptations as last fetched, less those decided on this device since. */
  saveAdaptations(adaptations: readonly Adaptation[]): Promise<void>;
  /** Undefined when never fetched (or malformed); an empty list is a fetched "none". */
  readAdaptations(): Promise<Adaptation[] | undefined>;
  /** The latest Check-in as last fetched; `null` is a fetched "none yet". */
  saveLatestCheckin(checkin: Checkin | null): Promise<void>;
  /** Undefined when never fetched (or malformed); `null` when the server had none. */
  readLatestCheckin(): Promise<Checkin | null | undefined>;
}

/** The in-memory stores (Test and Dev modes) can be emptied; the IndexedDB ones are cleared through the database. */
export interface Clearable {
  clear(): void;
}

/**
 * The local database holds one person's health data (queue, set and finish log, plan cache), so
 * it belongs to whoever signed in and never to the next person on the device.
 */
export interface LocalData {
  /** Wipes every local table, the owner included: sign-out and account deletion. */
  clear(): Promise<void>;
  /**
   * Records `userId` as the owner of the local data. When the data belonged to someone else (or to
   * no one, so nothing vouches for it), it is wiped first: a sign-out that never ran cannot leak.
   * The same owner again changes nothing.
   */
  claim(userId: string): Promise<void>;
}

export interface QueueRow {
  /** Set by the database on insert. */
  id?: number;
  request: Request;
}

export interface SetRow {
  id: string;
  sessionId: string;
  set: LogSetBody;
}

export interface ActivityRow extends LocalActivity {
  id: string;
}

export interface WaterRow extends LocalWater {
  id: string;
}

export interface StopFlagRow extends LocalStopFlag {
  id: string;
}

export interface CheckinRow extends LocalCheckin {
  id: string;
}

export interface FinishRow extends LocalFinish {
  sessionId: string;
}

export interface OwnerRow {
  key: string;
  userId: string;
}

export interface CacheRow {
  key: string;
  value: unknown;
}

/** Tests pass a fake IndexedDB; the browser's is the default. The one database holds the offline queue, the session log, the plan cache and who they belong to. */
export type LocalDatabaseOptions = Pick<DexieOptions, 'indexedDB' | 'IDBKeyRange'>;

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
  sessionLog: SessionLogStore;
  activityLog: ActivityLogStore;
  waterLog: WaterLogStore;
  stopFlags: StopFlagStore;
  checkins: CheckinStore;
  planCache: PlanCache;
  localData: LocalData;
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
  | { status: SafetyStatus.Referred; screening: SavedScreening; stop: StopState }
  /** Cleared to train, but a reported stop flag pauses it; `stop.pausing` is not empty. */
  | { status: SafetyStatus.Paused; screening: SavedScreening; stop: StopState }
  | { status: SafetyStatus.Ready; screening: SavedScreening; stop: StopState };

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

export interface GetSessionDetail extends Request<SessionDetail> {
  readonly type: RequestType.GetSessionDetail;
  readonly sessionId: string;
}

/** (`Request` suffix: `LogSet` and `FinishSession` are the contract's body types.) */
export interface LogSetRequest extends Request<LogSetResult | Queued> {
  readonly type: RequestType.LogSet;
  readonly sessionId: string;
  readonly set: LogSetBody;
}

export interface FinishSessionRequest extends Request<FinishSessionResult | Queued> {
  readonly type: RequestType.FinishSession;
  readonly sessionId: string;
  readonly finish: FinishSessionBody;
}

/** (`Request` suffix: `LogActivity` is the contract's body type.) */
export interface LogActivityRequest extends Request<LogActivityResult | Queued> {
  readonly type: RequestType.LogActivity;
  readonly activity: LogActivityBody;
}

/** (`Request` suffix: `SubmitCheckin` is the contract's body type.) */
export interface SubmitCheckinRequest extends Request<SubmitCheckinResult | Queued> {
  readonly type: RequestType.SubmitCheckin;
  readonly checkin: SubmitCheckinBody;
}

export interface GetLatestCheckinRequest extends Request<Checkin | null> {
  readonly type: RequestType.GetLatestCheckin;
}

/** (`Request` suffix: `ReportStopFlag` is the contract's body type.) */
export interface ReportStopFlagRequest extends Request<ReportStopFlagResult | Queued> {
  readonly type: RequestType.ReportStopFlag;
  readonly report: ReportStopFlagBody;
}

/** (`Request` suffix: `ConfirmDoctorSeen` is the contract's body type.) */
export interface ConfirmDoctorSeenRequest extends Request<ConfirmDoctorSeenResult> {
  readonly type: RequestType.ConfirmDoctorSeen;
  /** The kinds the person saw paused: only those end. */
  readonly flags: readonly StopFlag[];
}

/** (`Request` suffix: `RecheckScreening` is the contract's body type.) */
export interface RecheckScreeningRequest extends Request<SaveScreeningResult> {
  readonly type: RequestType.RecheckScreening;
  readonly recheck: RecheckScreeningBody;
}

export interface GetAdaptationsRequest extends Request<Adaptation[]> {
  readonly type: RequestType.GetAdaptations;
}

export interface AcceptAdaptationRequest extends Request<AcceptAdaptationResult | Queued> {
  readonly type: RequestType.AcceptAdaptation;
  readonly adaptation: Adaptation;
}

export interface DeclineAdaptationRequest extends Request<DeclineAdaptationResult | Queued> {
  readonly type: RequestType.DeclineAdaptation;
  readonly adaptationId: string;
}

export interface GetWeekLoad extends Request<WeekLoad> {
  readonly type: RequestType.GetWeekLoad;
}

export interface GetProgress extends Request<Progress> {
  readonly type: RequestType.GetProgress;
}

/** (`Request` suffix: `LogWeighIn` is the contract's body type.) */
export interface LogWeighInRequest extends Request<LogWeighInResult> {
  readonly type: RequestType.LogWeighIn;
  readonly weighIn: LogWeighInBody;
}

export interface GetNutritionRequest extends Request<NutritionState> {
  readonly type: RequestType.GetNutrition;
  /** The person's calendar day, `YYYY-MM-DD`. */
  readonly date: string;
}

export interface SaveNutritionSetupRequest extends Request<SaveNutritionSetupResult> {
  readonly type: RequestType.SaveNutritionSetup;
  readonly setup: NutritionSetup;
}

/** (`Request` suffix: `LogWater` is the contract's body type.) */
export interface LogWaterRequest extends Request<LogWaterResult | Queued> {
  readonly type: RequestType.LogWater;
  readonly water: LogWaterBody;
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

/** The fake API's stored week: the Program without the hard Activity days, which it works out on read. */
export type FakeWeek = Omit<ProgramWeek, 'hardActivityDates'>;

/** The fake API client: the `ApiClient` plus what tests and the Dev mode need to set it up. */
export interface FakeApiClient extends ApiClient {
  /** Stores a pending Adaptation for the signed-in user (the fake raises none itself); `basis` and `change` name Sessions of that user's fake week. */
  seedAdaptation(adaptation: Adaptation): Promise<void>;
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

export interface SyncResult {
  /** Entries taken off the queue during this run: replayed, or dropped because the server will never accept them. */
  replayed: number;
  /** Entries still waiting afterwards (the run stopped at a failure, or the device is offline). */
  remaining: number;
}

/** Replays the offline queue in order; concurrent calls share one run. Resolves, never rejects for a failed replay. */
export type SyncRunner = () => Promise<SyncResult>;

/** Calls `callback` every `ms` milliseconds until the returned function is called. */
export interface IntervalTimer {
  every(callback: () => void, ms: number): () => void;
}

export interface StartSyncOptions {
  sync: SyncRunner;
  /** The browser's `window`; anything that emits `focus` and `online`. */
  target: EventTarget;
  /** Also sync this often (a no-op while nothing waits), so a request queued after a transient failure while online is retried without a focus or online event. Off when omitted. */
  retryEveryMs?: number;
  /** Drives `retryEveryMs`; the system timer when omitted. Tests inject a fake. */
  timer?: IntervalTimer;
}

export interface ReadThroughCacheOptions<T> {
  isOnline: () => boolean;
  load: () => Promise<T>;
  save: (value: T) => Promise<void>;
  /** `undefined` when nothing was remembered. */
  cached: () => Promise<T | undefined>;
}
