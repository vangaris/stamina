import type { DraftUpdate, OnboardingDraft } from '../types.ts';

/**
 * The draft with one answer changed. Two answers depend on each other: picking play days turns
 * "It varies" off, and turning "It varies" on clears the days. The birth year keeps digits only.
 */
export function applyDraftUpdate(draft: OnboardingDraft, change: DraftUpdate): OnboardingDraft {
  const next = { ...draft, [change.field]: change.value };
  if (change.field === 'birthYear') next.birthYear = change.value.replace(/\D/g, '');
  if (change.field === 'playDays' && change.value.length > 0) next.playVaries = false;
  if (change.field === 'playVaries' && change.value) next.playDays = [];
  return next;
}
