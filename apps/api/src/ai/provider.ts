import type { AiProvider } from './types.ts';

export class AiUnavailableError extends Error {
  constructor() {
    super('AI provider is not configured');
    this.name = 'AiUnavailableError';
  }
}

/**
 * Phase A production: no key, no card. The gateway skips it (`available` is false), so callers
 * fall back to rules and fixed templates, exactly as for the kill switch.
 */
export const unavailableAiProvider: AiProvider = {
  available: false,
  async generateObject() {
    throw new AiUnavailableError();
  },
};
