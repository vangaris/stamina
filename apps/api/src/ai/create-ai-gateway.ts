import { and, count, eq, gte, sql } from 'drizzle-orm';
import { llmCall } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { AiCallError } from './ai-call-error.ts';
import { DEFAULT_AI_LIMITS, NO_AI_USAGE, UNKNOWN_MODEL } from './config.ts';
import { AiCallStatus } from './enums/ai-call-status.ts';
import { LlmOutcome } from './enums/llm-outcome.ts';
import { pseudonymizeUser } from './pseudonymize-user.ts';
import type { AiCall, AiCallResult, AiGateway, AiGatewayOptions, AiUsage } from './types.ts';

const startOfUtcDay = (at: Date): Date =>
  new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
const startOfUtcMonth = (at: Date): Date =>
  new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));

/**
 * The one door to the model. Before a call: no provider means `Unavailable`; the month's spend at
 * or past the kill-switch share of the cap means `KillSwitch`; a person's calls today at their
 * daily limit means `UserCapReached`. None of those calls the provider or writes a log row. A
 * call that reaches the provider is always logged (purpose, model, tokens, cost, pseudonym,
 * outcome), whether it is accepted, refused by `check`, or fails. The provider's own failures
 * never escape: the caller falls back to rules. A failure to write the log row does escape,
 * because an unlogged call would break the spend accounting the kill switch relies on.
 *
 * Runs as the connection's own role (the table owner): `llm_call` has no policy for the app role.
 */
export function createAiGateway(
  db: Db,
  { provider, pseudonymSecret, limits, now = () => new Date() }: AiGatewayOptions,
): AiGateway {
  const { userCallsPerDay, monthlyCapMicroUsd, killSwitchShare } = {
    ...DEFAULT_AI_LIMITS,
    ...limits,
  };

  async function monthSpendMicroUsd(at: Date): Promise<number> {
    const [row] = await db
      .select({ spend: sql<string>`coalesce(sum(${llmCall.costMicroUsd}), 0)` })
      .from(llmCall)
      .where(gte(llmCall.at, startOfUtcMonth(at)));
    return Number(row!.spend);
  }

  async function callsToday(pseudonym: string, at: Date): Promise<number> {
    const [row] = await db
      .select({ calls: count() })
      .from(llmCall)
      .where(and(eq(llmCall.userPseudonym, pseudonym), gte(llmCall.at, startOfUtcDay(at))));
    return row!.calls;
  }

  return {
    async run<T>({ userId, request, check }: AiCall<T>): Promise<AiCallResult<T>> {
      if (!provider.available) return { status: AiCallStatus.Unavailable };
      const at = now();
      if (userId !== null && pseudonymSecret === undefined) {
        throw new Error("A call made for a user needs the gateway's pseudonymSecret");
      }
      const pseudonym = userId === null ? null : await pseudonymizeUser(pseudonymSecret!, userId);

      if ((await monthSpendMicroUsd(at)) >= monthlyCapMicroUsd * killSwitchShare) {
        return { status: AiCallStatus.KillSwitch };
      }
      if (pseudonym !== null && (await callsToday(pseudonym, at)) >= userCallsPerDay) {
        return { status: AiCallStatus.UserCapReached };
      }

      const record = (model: string, usage: AiUsage, outcome: LlmOutcome, detail: string | null) =>
        db.insert(llmCall).values({
          at,
          userPseudonym: pseudonym,
          purpose: request.purpose,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          costMicroUsd: usage.costMicroUsd,
          outcome,
          detail,
        });

      let result;
      try {
        result = await provider.generateObject(request);
      } catch (cause) {
        const failure = cause instanceof AiCallError ? cause : undefined;
        await record(
          failure?.model ?? UNKNOWN_MODEL,
          failure?.usage ?? NO_AI_USAGE,
          LlmOutcome.Failed,
          failure?.failure ?? null,
        );
        return { status: AiCallStatus.Failed, cause };
      }

      const code = check?.(result.object) ?? null;
      await record(
        result.model,
        result.usage,
        code === null ? LlmOutcome.Accepted : LlmOutcome.Rejected,
        code,
      );
      return code === null
        ? { status: AiCallStatus.Accepted, object: result.object, model: result.model }
        : { status: AiCallStatus.Rejected, code };
    },
  };
}
