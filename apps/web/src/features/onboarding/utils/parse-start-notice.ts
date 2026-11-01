import { StartNotice } from '../enums/start-notice.ts';

/** The notice named in a route query value, or `undefined` for anything else (a typed-in URL can say anything). */
export function parseStartNotice(value: unknown): StartNotice | undefined {
  return Object.values(StartNotice).find((notice) => notice === value);
}
