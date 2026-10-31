import type { ApiClient } from '@stamina/contracts';
import type { z } from 'zod';
import type { HealthStateKind } from './enums/health-state-kind.ts';
import type { OfflinePolicy } from './enums/offline-policy.ts';
import type { RequestOutcome } from './enums/request-outcome.ts';
import type { RequestType } from './enums/request-type.ts';
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

export interface Services extends PipelineServices {
  api: ApiClient;
  auth: AuthService;
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
