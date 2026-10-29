import type { z } from 'zod';

export type AiPurpose = 'session-picks' | 'meal-idea';

export interface AiRequest<T> {
  purpose: AiPurpose;
  prompt: string;
  /** Strict schema the provider's structured output must satisfy. */
  schema: z.ZodType<T>;
}

/** The one seam to the model vendor: production uses Anthropic, tests use a deterministic fake. */
export interface AiProvider {
  generateObject<T>(request: AiRequest<T>): Promise<T>;
}

export class AiUnavailableError extends Error {
  constructor() {
    super('AI provider is not configured');
    this.name = 'AiUnavailableError';
  }
}

/** Callers treat this like the kill switch: fall back to rules and fixed templates. */
export const unavailableAiProvider: AiProvider = {
  async generateObject() {
    throw new AiUnavailableError();
  },
};
