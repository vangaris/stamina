import type { AiLimits } from './types.ts';

/** The domain label the pseudonym key is derived under, so the Screening key is never used raw. */
export const PSEUDONYM_KEY_LABEL = 'stamina:llm-call-pseudonym:v1';

/** Spec "AI layer, Caps": 15 calls per user per day, provider hard cap $10 per month, kill switch at 80 %. */
export const DEFAULT_AI_LIMITS: AiLimits = {
  userCallsPerDay: 15,
  monthlyCapMicroUsd: 10_000_000,
  killSwitchShare: 0.8,
};

/** The model recorded for a failed call whose provider named none. */
export const UNKNOWN_MODEL = 'unknown';

export const TOKENS_PER_MILLION = 1_000_000;

export const ANTHROPIC_BASE_URL = 'https://api.anthropic.com';
/** The Messages API version header (https://platform.claude.com/docs/en/api/versioning). */
export const ANTHROPIC_VERSION = '2026-10-21';
/** Claude Haiku 5.5, the production model (spec "AI layer"). */
export const ANTHROPIC_MODEL = 'claude-haiku-5-5';
/**
 * Millionths of a US dollar per million tokens, for prompts up to 100,000 tokens: $0.10 in,
 * $0.50 out (https://platform.claude.com/docs/en/models/haiku-5-5/overview). Our prompts are
 * far below that tier. A model missing here cannot be priced, so the adapter refuses to start.
 */
export const ANTHROPIC_PRICES: Readonly<
  Record<string, { inputMicroUsdPerMillion: number; outputMicroUsdPerMillion: number }>
> = {
  [ANTHROPIC_MODEL]: { inputMicroUsdPerMillion: 100_000, outputMicroUsdPerMillion: 500_000 },
};
/** Headroom for the answer and any thinking; it also bounds what one call can cost. */
export const ANTHROPIC_MAX_OUTPUT_TOKENS = 4096;
/** Picking from a list and drafting from a name need little thinking. */
export const ANTHROPIC_EFFORT = 'low';
/** A call that takes longer is a failure the caller falls back from. */
export const ANTHROPIC_TIMEOUT_MS = 30_000;
