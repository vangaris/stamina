import { PROMPT_DATA_MARKER } from '../src/picks/index.ts';
import type { PromptData } from './types.ts';

/** The data block of a Session picks prompt. */
export function dataOfPrompt(prompt: string): PromptData {
  return JSON.parse(
    prompt.slice(prompt.indexOf(PROMPT_DATA_MARKER) + PROMPT_DATA_MARKER.length),
  ) as PromptData;
}
