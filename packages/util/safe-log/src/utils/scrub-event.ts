import { EVENT_FIELDS, TAG_FIELDS } from '../config.ts';
import type { Json } from '../types.ts';
import { isRecord } from './is-record.ts';
import { pick } from './pick.ts';
import { scrubException } from './scrub-exception.ts';

/**
 * Sentry `beforeSend`: returns the event reduced to allowlisted fields, or `null` for anything
 * that is not an error event (transactions, messages).
 */
export function scrubEvent<E extends object>(event: E): E | null {
  const source = event as Json;
  if (source.type !== undefined) return null;
  const values = isRecord(source.exception) ? source.exception.values : undefined;
  if (!Array.isArray(values)) return null;

  const out = pick(source, EVENT_FIELDS);
  out.exception = { values: values.map(scrubException).filter(Boolean) };
  if (isRecord(source.tags)) {
    const tags = pick(source.tags, TAG_FIELDS);
    if (Object.keys(tags).length > 0) out.tags = tags;
  }
  return out as E;
}
