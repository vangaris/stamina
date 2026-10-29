/**
 * Error reports keep what is needed to find a bug (exception type, stack frames) and drop
 * everything else. Exception messages are blanked because they can embed user input such as
 * health data. The event is rebuilt from an allowlist, so a field the SDK adds later is dropped
 * until someone allows it here.
 */

const EVENT_FIELDS = [
  'event_id',
  'timestamp',
  'platform',
  'level',
  'release',
  'environment',
  'sdk',
];
const TAG_FIELDS = ['request_id'];
const FRAME_FIELDS = ['function', 'module', 'lineno', 'colno', 'in_app'];
const URL_FRAME_FIELDS = ['filename', 'abs_path'];
const MECHANISM_FIELDS = ['type', 'handled', 'synthetic'];
const MAX_TYPE_LENGTH = 100;

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick(source: Json, keys: readonly string[]): Json {
  const out: Json = {};
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

/** Drops the query string and fragment, which can carry user input, from a URL or path. */
export function stripUrlQuery(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

function scrubFrame(frame: unknown): Json | undefined {
  if (!isRecord(frame)) return undefined;
  const out = pick(frame, FRAME_FIELDS);
  for (const key of URL_FRAME_FIELDS) {
    const value = frame[key];
    if (typeof value === 'string') out[key] = stripUrlQuery(value);
  }
  return out;
}

function scrubException(exception: unknown): Json | undefined {
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

/** Sentry `beforeBreadcrumb`: breadcrumb messages and data can embed user input, so none are kept. */
export function scrubBreadcrumb(): null {
  return null;
}
