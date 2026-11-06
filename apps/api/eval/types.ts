import type { SessionFocus } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { z } from 'zod';
import type { evalCaseSchema } from './eval-case-schema.ts';

/** One evaluation case: a person-shaped situation the Session picks prompt is built for. */
export type EvalCase = z.infer<typeof evalCaseSchema>;

/** How one case ended: a valid first answer, or the reason it was not. */
export interface CaseResult {
  id: string;
  locale: Locale;
  focus: SessionFocus;
  /** `null` when the first answer passed the validators; else the problem or failure code. */
  failure: string | null;
  costMicroUsd: number;
}

export interface EvalReport {
  provider: string;
  model: string;
  promptVersion: string;
  /** False for the offline harness provider: the pass rate then says nothing about a model. */
  measuresModel: boolean;
  results: CaseResult[];
}
