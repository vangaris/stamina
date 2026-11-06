import type { z } from 'zod';
import type { AiCallStatus } from './enums/ai-call-status.ts';
import type { AiPurpose } from './enums/ai-purpose.ts';

export interface AiRequest<T> {
  purpose: AiPurpose;
  prompt: string;
  /** Strict schema the provider's structured output must satisfy. */
  schema: z.ZodType<T>;
}

/** What one provider call used. The provider prices it: it knows the model's rates. */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  /** Whole millionths of a US dollar, rounded up. */
  costMicroUsd: number;
}

export interface AiResult<T> {
  object: T;
  /** The model that answered, as the provider names it. */
  model: string;
  usage: AiUsage;
}

/** The one seam to the model vendor: production uses Anthropic, tests use a deterministic fake. */
export interface AiProvider {
  /** False for the Phase A "unavailable" provider: the gateway then skips the call and its accounting. */
  readonly available: boolean;
  generateObject<T>(request: AiRequest<T>): Promise<AiResult<T>>;
}

/** The limits the gateway enforces. */
export interface AiLimits {
  /** Calls one person may make per UTC day, whatever the purpose. */
  userCallsPerDay: number;
  /** The provider's hard cap per UTC month, in millionths of a US dollar. */
  monthlyCapMicroUsd: number;
  /** The share of the monthly cap at which every call falls back to rules (0 to 1). */
  killSwitchShare: number;
}

export interface AiGatewayOptions {
  provider: AiProvider;
  /**
   * The text the pseudonym of a user is derived from (the Screening key). Required for calls
   * made for a user; calls with no user (the founder's scripts) need none.
   */
  pseudonymSecret?: string;
  limits?: Partial<AiLimits>;
  now?: () => Date;
}

/**
 * One call. `userId` is `null` for work that is not about a person (the founder's Sport Profile
 * draft): no per-user cap applies and the log row has no pseudonym.
 */
export interface AiCall<T> {
  userId: string | null;
  request: AiRequest<T>;
  /** Refuses an answer: returns a short code (never the content), or `null` to accept it. */
  check?: (object: T) => string | null;
}

export type AiCallResult<T> =
  | { status: AiCallStatus.Accepted; object: T; model: string }
  | { status: AiCallStatus.Rejected; code: string }
  | { status: AiCallStatus.Failed; cause: unknown }
  | {
      status: AiCallStatus.Unavailable | AiCallStatus.UserCapReached | AiCallStatus.KillSwitch;
    };

/**
 * Every model call goes through here: it enforces the per-user daily cap and the global kill
 * switch before calling, and logs every call that reached the provider (purpose, model, tokens,
 * cost, a pseudonym of the user, how it ended). Never throws for a provider or check failure;
 * the caller falls back to rules.
 */
export interface AiGateway {
  run<T>(call: AiCall<T>): Promise<AiCallResult<T>>;
}
