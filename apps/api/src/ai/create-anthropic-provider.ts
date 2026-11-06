import { z } from 'zod';
import { AiCallError } from './ai-call-error.ts';
import {
  ANTHROPIC_BASE_URL,
  ANTHROPIC_EFFORT,
  ANTHROPIC_MAX_OUTPUT_TOKENS,
  ANTHROPIC_MODEL,
  ANTHROPIC_PRICES,
  ANTHROPIC_TIMEOUT_MS,
  ANTHROPIC_VERSION,
  TOKENS_PER_MILLION,
} from './config.ts';
import { AiCallFailure } from './enums/ai-call-failure.ts';
import { AnthropicStopReason } from './enums/anthropic-stop-reason.ts';
import { toStructuredOutputSchema } from './to-structured-output-schema.ts';
import type { AiProvider, AiRequest, AiResult, AiUsage } from './types.ts';

export interface AnthropicProviderOptions {
  apiKey: string;
  /** Defaults to Claude Haiku 5.5. A model without a price in `ANTHROPIC_PRICES` is refused. */
  model?: string;
  /** Defaults to `globalThis.fetch`; tests pass a stub. */
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
}

/** The parts of a Messages API response the adapter reads. */
const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  stop_reason: z.string().nullable(),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

/**
 * The Anthropic Messages API behind the provider interface. One request per call: the prompt as
 * the only user message, the schema as `output_config.format` (structured outputs), low effort
 * and a bounded output. No sampling parameters (the current API versions reject them). The
 * answer is the text block of the response, parsed as JSON and then by the caller's zod schema.
 * Every failure is an `AiCallError` that names the cause and, when the provider billed for the
 * answer, its usage; neither the prompt nor the answer ever reaches an error message.
 */
export function createAnthropicProvider({
  apiKey,
  model = ANTHROPIC_MODEL,
  fetch = globalThis.fetch,
  baseUrl = ANTHROPIC_BASE_URL,
}: AnthropicProviderOptions): AiProvider {
  const price = ANTHROPIC_PRICES[model];
  if (price === undefined) throw new Error(`No price is known for model "${model}"`);

  const cost = ({
    input_tokens,
    output_tokens,
  }: {
    input_tokens: number;
    output_tokens: number;
  }): AiUsage => ({
    inputTokens: input_tokens,
    outputTokens: output_tokens,
    costMicroUsd: Math.ceil(
      (input_tokens * price.inputMicroUsdPerMillion +
        output_tokens * price.outputMicroUsdPerMillion) /
        TOKENS_PER_MILLION,
    ),
  });

  return {
    available: true,
    async generateObject<T>({ prompt, schema }: AiRequest<T>): Promise<AiResult<T>> {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model,
            max_tokens: ANTHROPIC_MAX_OUTPUT_TOKENS,
            output_config: {
              effort: ANTHROPIC_EFFORT,
              format: { type: 'json_schema', schema: toStructuredOutputSchema(schema) },
            },
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
        });
      } catch {
        throw new AiCallError(AiCallFailure.Network, model);
      }
      if (!response.ok) throw new AiCallError(AiCallFailure.Http, model);

      const parsed = responseSchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw new AiCallError(AiCallFailure.Malformed, model);
      const { content, stop_reason, usage } = parsed.data;
      const used = cost(usage);

      if (stop_reason === AnthropicStopReason.Refusal) {
        throw new AiCallError(AiCallFailure.Refused, model, used);
      }
      if (stop_reason === AnthropicStopReason.MaxTokens) {
        throw new AiCallError(AiCallFailure.Truncated, model, used);
      }
      // Thinking blocks may come first: the answer is the text block, chosen by type.
      const text = content.find((block) => block.type === 'text')?.text;
      let object;
      try {
        object = schema.parse(JSON.parse(text ?? ''));
      } catch {
        throw new AiCallError(AiCallFailure.Malformed, model, used);
      }
      return { object, model, usage: used };
    },
  };
}
