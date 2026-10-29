import type { AiProvider, AiRequest } from '../../src/ai/provider.ts';

/** Deterministic stand-in for the model: replies come from a queue the test controls. */
export function createFakeAi() {
  const replies: unknown[] = [];
  const calls: AiRequest<unknown>[] = [];
  const provider: AiProvider = {
    async generateObject<T>(request: AiRequest<T>): Promise<T> {
      calls.push(request);
      if (replies.length === 0) throw new Error('fake AI has no queued reply');
      return request.schema.parse(replies.shift());
    },
  };
  return { provider, calls, queue: (reply: unknown) => void replies.push(reply) };
}
