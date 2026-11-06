import { stopFlagEffect, type ScreeningQuestion, type StopFlag } from '@stamina/domain';

/** The Screening questions `flags` ask again, each once, in the order the flags list them. */
export function toRecheckQuestions(flags: readonly StopFlag[]): ScreeningQuestion[] {
  return [...new Set(flags.flatMap((flag) => stopFlagEffect(flag).recheck))];
}
