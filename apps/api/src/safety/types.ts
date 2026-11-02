import type { BodyArea, ScreeningQuestion } from '@stamina/domain';
import type { screening } from '../db/schema.ts';

export type ScreeningRow = typeof screening.$inferSelect;

/** What is encrypted into `answers_encrypted`: everything the person told Screening. */
export interface StoredAnswers {
  answers: Record<ScreeningQuestion, boolean>;
  bodyAreas: BodyArea[];
}
