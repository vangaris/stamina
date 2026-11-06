import { AiCallError, AiCallFailure } from '../../src/ai/index.ts';
import type { AiProvider, AiRequest, AiUsage } from '../../src/ai/index.ts';

export const FAKE_AI_MODEL = 'fake-model';

/** What a reply costs unless the test says otherwise: small and exact, so sums are easy to check. */
export const FAKE_AI_USAGE: AiUsage = { inputTokens: 100, outputTokens: 50, costMicroUsd: 100 };

/** Answers a request when nothing is queued; may be async, and may throw to fail the call. */
type Responder = (request: AiRequest<unknown>) => unknown;

type Reply =
  { kind: 'object'; value: unknown; usage: AiUsage } | { kind: 'failure'; usage?: AiUsage };

/**
 * Deterministic stand-in for the model: replies come from a queue the test controls. A queued
 * object is parsed by the request's schema like the real provider's structured output, so a
 * schema-invalid reply fails the call (and still costs) instead of reaching the caller.
 */
export function createFakeAi() {
  const replies: Reply[] = [];
  let responder: Responder | undefined;
  let responderUsage = FAKE_AI_USAGE;
  const calls: AiRequest<unknown>[] = [];
  const provider: AiProvider = {
    available: true,
    async generateObject<T>(request: AiRequest<T>) {
      calls.push(request);
      const queued = replies.shift();
      if (queued === undefined && responder === undefined) {
        throw new Error('fake AI has no queued reply');
      }
      const reply: Reply = queued ?? {
        kind: 'object',
        value: await responder!(request),
        usage: responderUsage,
      };
      if (reply.kind === 'failure') {
        throw new AiCallError(AiCallFailure.Http, FAKE_AI_MODEL, reply.usage);
      }
      const parsed = request.schema.safeParse(reply.value);
      if (!parsed.success)
        throw new AiCallError(AiCallFailure.Malformed, FAKE_AI_MODEL, reply.usage);
      return { object: parsed.data, model: FAKE_AI_MODEL, usage: reply.usage };
    },
  };
  return {
    provider,
    calls,
    queue: (value: unknown, usage: AiUsage = FAKE_AI_USAGE) =>
      void replies.push({ kind: 'object', value, usage }),
    /** The next call fails like a provider error. */
    queueFailure: (usage?: AiUsage) =>
      void replies.push({ kind: 'failure', ...(usage ? { usage } : {}) }),
    /** Answers every call nothing is queued for, with `usage` each; `undefined` stops it. */
    respondWith: (answer: Responder | undefined, usage: AiUsage = FAKE_AI_USAGE) => {
      responder = answer;
      responderUsage = usage;
    },
    /** Replies nobody asked for yet. */
    pending: () => replies.length,
  };
}
