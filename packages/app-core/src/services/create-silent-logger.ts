import type { Logger } from '../types.ts';

export function createSilentLogger(): Logger {
  return { log: () => undefined };
}
