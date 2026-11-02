import type { ScreeningDraft } from '../types.ts';

/** An empty page: every question is unanswered, because an answer is never assumed. */
export function createScreeningDraft(): ScreeningDraft {
  return { answers: {}, bodyAreas: [], trainedRegularly: undefined };
}
