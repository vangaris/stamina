import { z } from 'zod';
import {
  SCHEMA_MAP_KEYWORDS,
  STRUCTURED_OUTPUT_MAX_MIN_ITEMS,
  STRUCTURED_OUTPUT_UNSUPPORTED_KEYWORDS,
} from './config.ts';

/**
 * Drops the keywords the provider rejects from one schema node and every schema below it. The
 * keys of a `properties`-style map are the caller's field names, not keywords, so they are kept
 * whatever they are called (a field named `minimum` stays); only the schemas under them are cleaned.
 */
function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node === null || typeof node !== 'object') return node;
  const entries = Object.entries(node)
    .filter(([key]) => !STRUCTURED_OUTPUT_UNSUPPORTED_KEYWORDS.includes(key))
    .filter(
      ([key, value]) => key !== 'minItems' || Number(value) <= STRUCTURED_OUTPUT_MAX_MIN_ITEMS,
    )
    .map(([key, value]) => [
      key,
      SCHEMA_MAP_KEYWORDS.includes(key) && value !== null && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([name, child]) => [name, strip(child)]))
        : strip(value),
    ]);
  return Object.fromEntries(entries);
}

/** The JSON Schema for `schema`'s output, limited to what the provider accepts. */
export function toStructuredOutputSchema(schema: z.ZodType): Record<string, unknown> {
  return strip(z.toJSONSchema(schema, { io: 'output' })) as Record<string, unknown>;
}
