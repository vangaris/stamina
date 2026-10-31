import type { Logger } from '../types.ts';

/** Prints the allowlisted `LogEntry` fields as one JSON line. */
export function createConsoleLogger(): Logger {
  return { log: (entry) => console.info(JSON.stringify(entry)) };
}
