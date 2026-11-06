import type { ScreeningSubmission } from '@stamina/contracts';
import { ScreeningQuestion, StartingLevel } from '@stamina/domain';

/** A Screening submission that answers yes to the given questions and no to the rest. */
export function buildScreeningSubmission(yes: ScreeningQuestion[] = []): ScreeningSubmission {
  return {
    answers: Object.fromEntries(
      Object.values(ScreeningQuestion).map((question) => [question, yes.includes(question)]),
    ) as Record<ScreeningQuestion, boolean>,
    bodyAreas: [],
    startingLevel: StartingLevel.Beginner,
  };
}
