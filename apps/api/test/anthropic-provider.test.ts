import { sportDraftSchema } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AiCallError, AiCallFailure, AiPurpose, createAnthropicProvider } from '../src/ai/index.ts';
import { sessionPicksSchema } from '../src/picks/index.ts';

const schema = z.object({ answer: z.string().max(20), count: z.number().int().min(0).max(9) });
const REQUEST = { purpose: AiPurpose.SessionPicks, prompt: 'Pick things.', schema };

/** What the Messages API returns, in the shape its documentation gives. */
const messageResponse = (overrides: Record<string, unknown> = {}) => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-haiku-5-5',
  content: [
    { type: 'thinking', thinking: '', signature: 'sig' },
    { type: 'text', text: JSON.stringify({ answer: 'ok', count: 2 }) },
  ],
  stop_reason: 'end_turn',
  usage: { input_tokens: 1000, output_tokens: 500 },
  ...overrides,
});

interface Seen {
  url: string;
  headers: Record<string, string>;
  body: { output_config: { format: { schema: unknown } } } & Record<string, unknown>;
}

/** A provider whose HTTP is a stub that answers `respond` and records what it was sent. */
function providerWith(respond: () => Response | Promise<Response>) {
  const seen: Seen[] = [];
  const stub = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return respond();
  }) as typeof fetch;
  return { provider: createAnthropicProvider({ apiKey: 'sk-test', fetch: stub }), seen };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const failureOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AiCallError);
  return error as AiCallError;
};

describe('the Anthropic provider', () => {
  it('sends one Messages API request with the key, the version, structured output and no sampling parameters', async () => {
    const { provider, seen } = providerWith(() => json(messageResponse()));
    await provider.generateObject(REQUEST);

    expect(seen).toHaveLength(1);
    const [request] = seen;
    expect(request!.url).toBe('https://api.anthropic.com/v1/messages');
    expect(request!.headers).toMatchObject({
      'x-api-key': 'sk-test',
      'anthropic-version': '2026-10-21',
      'content-type': 'application/json',
    });
    expect(request!.body).toMatchObject({
      model: 'claude-haiku-5-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: 'Pick things.' }],
      output_config: { effort: 'low', format: { type: 'json_schema' } },
    });
    for (const removed of ['temperature', 'top_p', 'top_k']) {
      expect(request!.body).not.toHaveProperty(removed);
    }
  });

  it('reads the text block after a thinking block, parses it, and prices the usage', async () => {
    const { provider } = providerWith(() => json(messageResponse()));
    const result = await provider.generateObject(REQUEST);

    expect(result.object).toEqual({ answer: 'ok', count: 2 });
    expect(result.model).toBe('claude-haiku-5-5');
    // $0.10 per million input tokens and $0.50 per million output tokens, in millionths of a dollar.
    expect(result.usage).toEqual({ inputTokens: 1000, outputTokens: 500, costMicroUsd: 350 });
  });

  it('rounds the cost up to a whole millionth of a dollar', async () => {
    const { provider } = providerWith(() =>
      json(messageResponse({ usage: { input_tokens: 1, output_tokens: 1 } })),
    );
    expect((await provider.generateObject(REQUEST)).usage.costMicroUsd).toBe(1);
  });

  it.each([
    ['a schema with string, number and array limits', schema],
    ['the Sport Profile draft', sportDraftSchema],
    ['the Session picks', sessionPicksSchema],
  ])('sends %s without the keywords structured outputs reject', async (_name, wanted) => {
    const { provider, seen } = providerWith(() => json(messageResponse()));
    await provider
      .generateObject({ ...REQUEST, schema: wanted as z.ZodType<unknown> })
      .catch(() => {});

    const sent = JSON.stringify(seen[0]!.body.output_config.format.schema);
    for (const keyword of [
      'minLength',
      'maxLength',
      'minimum',
      'maximum',
      'exclusiveMinimum',
      'exclusiveMaximum',
      'multipleOf',
      'maxItems',
      'uniqueItems',
      '$schema',
    ]) {
      expect(sent).not.toContain(`"${keyword}"`);
    }
    expect(sent).not.toMatch(/"minItems":([2-9]|\d\d)/);
  });

  it('keeps a field whose name is a dropped keyword and still requires it', async () => {
    const odd = z.object({ minimum: z.number().min(1), maxLength: z.string().max(5) });
    const { provider, seen } = providerWith(() => json(messageResponse()));
    await provider
      .generateObject({ ...REQUEST, schema: odd as z.ZodType<unknown> })
      .catch(() => {});

    const sent = seen[0]!.body.output_config.format.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(Object.keys(sent.properties).sort()).toEqual(['maxLength', 'minimum']);
    expect(sent.required.sort()).toEqual(['maxLength', 'minimum']);
    expect(sent.properties.minimum).toEqual({ type: 'number' });
  });

  it('keeps the limits it drops from the request enforced on the answer', async () => {
    const { provider } = providerWith(() =>
      json(messageResponse({ content: [{ type: 'text', text: '{"answer":"ok","count":99}' }] })),
    );
    const error = await failureOf(provider.generateObject(REQUEST));
    expect(error.failure).toBe(AiCallFailure.Malformed);
    expect(error.usage?.costMicroUsd).toBe(350);
  });

  it('fails with the HTTP error and no usage when the API answers an error status', async () => {
    const { provider } = providerWith(() =>
      json({ type: 'error', error: { type: 'overloaded_error' } }, 529),
    );
    const error = await failureOf(provider.generateObject(REQUEST));
    expect(error).toMatchObject({ failure: AiCallFailure.Http, model: 'claude-haiku-5-5' });
    expect(error.usage).toBeUndefined();
  });

  it('fails with a network error and no usage when there is no answer', async () => {
    const { provider } = providerWith(() => {
      throw new TypeError('fetch failed');
    });
    const error = await failureOf(provider.generateObject(REQUEST));
    expect(error.failure).toBe(AiCallFailure.Network);
    expect(error.usage).toBeUndefined();
  });

  it.each([
    ['a refusal', { stop_reason: 'refusal', content: [] }, AiCallFailure.Refused],
    [
      'an answer cut off at the output limit',
      { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"answer":"o' }] },
      AiCallFailure.Truncated,
    ],
    [
      'an answer that is not JSON',
      { content: [{ type: 'text', text: 'Sure! Here you go.' }] },
      AiCallFailure.Malformed,
    ],
    [
      'an answer with no text block',
      { content: [{ type: 'thinking', thinking: '' }] },
      AiCallFailure.Malformed,
    ],
  ])('fails on %s, keeping the cost the API billed', async (_name, overrides, failure) => {
    const { provider } = providerWith(() => json(messageResponse(overrides)));
    const error = await failureOf(provider.generateObject(REQUEST));
    expect(error.failure).toBe(failure);
    expect(error.usage).toEqual({ inputTokens: 1000, outputTokens: 500, costMicroUsd: 350 });
  });

  it('fails as malformed, with no usage, when the response is not a Messages API response', async () => {
    const { provider } = providerWith(() => json({ hello: 'world' }));
    const error = await failureOf(provider.generateObject(REQUEST));
    expect(error.failure).toBe(AiCallFailure.Malformed);
    expect(error.usage).toBeUndefined();
  });

  it('never puts the prompt, the answer or the key into an error message', async () => {
    const { provider } = providerWith(() =>
      json(messageResponse({ content: [{ type: 'text', text: 'SECRET-ANSWER' }] })),
    );
    const error = await failureOf(provider.generateObject({ ...REQUEST, prompt: 'SECRET-PROMPT' }));
    for (const secret of ['SECRET-PROMPT', 'SECRET-ANSWER', 'sk-test']) {
      expect(error.message).not.toContain(secret);
    }
  });

  it('refuses a model it cannot price', () => {
    expect(() => createAnthropicProvider({ apiKey: 'k', model: 'claude-unknown' })).toThrow(
      /No price is known/,
    );
  });
});
