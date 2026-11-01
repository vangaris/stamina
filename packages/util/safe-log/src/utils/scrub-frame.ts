import { FRAME_FIELDS, URL_FRAME_FIELDS } from '../config.ts';
import type { Json } from '../types.ts';
import { isRecord } from './is-record.ts';
import { pick } from './pick.ts';
import { stripUrlQuery } from './strip-url-query.ts';

/** Keeps allowlisted stack-frame fields and strips query/fragment from file URLs; `undefined` if not a frame. */
export function scrubFrame(frame: unknown): Json | undefined {
  if (!isRecord(frame)) return undefined;
  const out = pick(frame, FRAME_FIELDS);
  for (const key of URL_FRAME_FIELDS) {
    const value = frame[key];
    if (typeof value === 'string') out[key] = stripUrlQuery(value);
  }
  return out;
}
