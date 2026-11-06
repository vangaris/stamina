import { z } from 'zod';

/**
 * Keywords the provider's structured outputs reject (https://platform.claude.com/docs/en/build-with-claude/structured-outputs,
 * "JSON Schema limitations"). They are dropped from what is sent; the answer is still parsed
 * with the full zod schema afterwards, so the constraints are enforced locally.
 */
const UNSUPPORTED_KEYWORDS = [
  '$schema',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'maxItems',
  'uniqueItems',
] as const;

/** Array `minItems` is supported only as 0 or 1. */
const MAX_SUPPORTED_MIN_ITEMS = 1;

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node === null || typeof node !== 'object') return node;
  const entries = Object.entries(node)
    .filter(([key]) => !(UNSUPPORTED_KEYWORDS as readonly string[]).includes(key))
    .filter(([key, value]) => key !== 'minItems' || Number(value) <= MAX_SUPPORTED_MIN_ITEMS)
    .map(([key, value]) => [key, strip(value)] as const);
  return Object.fromEntries(entries);
}

/** The JSON Schema for `schema`'s output, limited to what the provider accepts. */
export function toStructuredOutputSchema(schema: z.ZodType): Record<string, unknown> {
  return strip(z.toJSONSchema(schema, { io: 'output' })) as Record<string, unknown>;
}
