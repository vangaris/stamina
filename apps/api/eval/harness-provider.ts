import { dataOfPrompt } from './prompt-data.ts';
import { HARNESS_MODEL } from './config.ts';
import type { AiProvider } from '../src/ai/index.ts';

/**
 * Stands in for a model when no API key is configured (Phase A, CI without secrets): answers every
 * prompt with the first candidates of each slot, never repeating an id. It exercises the
 * harness, the prompt builder and the validators end to end, and proves nothing about a model.
 */
export const harnessProvider: AiProvider = {
  available: true,
  async generateObject({ prompt, schema }) {
    const used = new Set<string>();
    const picks = dataOfPrompt(prompt).slots.flatMap(({ slot, count, candidates }) => {
      const chosen = candidates.filter((id) => !used.has(id)).slice(0, count);
      for (const id of chosen) used.add(id);
      return chosen.map((exerciseId) => ({ slot, exerciseId, reason: 'First candidate.' }));
    });
    return {
      object: schema.parse({ picks }),
      model: HARNESS_MODEL,
      usage: { inputTokens: 0, outputTokens: 0, costMicroUsd: 0 },
    };
  },
};
