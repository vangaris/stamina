import { MAX_TYPE_LENGTH, MECHANISM_FIELDS } from '../config.ts';
import type { Json } from '../types.ts';
import { isRecord } from './is-record.ts';
import { pick } from './pick.ts';
import { scrubFrame } from './scrub-frame.ts';

/**
 * Keeps the exception type (length-capped), allowlisted mechanism fields and scrubbed stack frames.
 * The message (`value`) is always blanked because it can embed user input such as health data.
 */
export function scrubException(exception: unknown): Json | undefined {
  if (!isRecord(exception)) return undefined;
  const out: Json = {
    type: typeof exception.type === 'string' ? exception.type.slice(0, MAX_TYPE_LENGTH) : 'Error',
    value: '',
  };
  if (isRecord(exception.mechanism)) out.mechanism = pick(exception.mechanism, MECHANISM_FIELDS);
  if (isRecord(exception.stacktrace) && Array.isArray(exception.stacktrace.frames)) {
    out.stacktrace = { frames: exception.stacktrace.frames.map(scrubFrame).filter(Boolean) };
  }
  return out;
}
