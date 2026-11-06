import type { SessionSlot } from '@stamina/domain';

/** The data block of a Session picks prompt, after its fixed instructions. */
export interface PromptData {
  slots: { slot: SessionSlot; count: number; candidates: string[] }[];
}

const MARKER = '\nData:\n';

export function dataOfPrompt(prompt: string): PromptData {
  return JSON.parse(prompt.slice(prompt.indexOf(MARKER) + MARKER.length)) as PromptData;
}
