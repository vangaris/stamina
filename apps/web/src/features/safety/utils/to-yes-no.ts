import { YesNo } from '../enums/yes-no.ts';

/** The chip to show as picked for an answer; `null` while the question is unanswered. */
export function toYesNo(answer: boolean | undefined): YesNo | null {
  if (answer === undefined) return null;
  return answer ? YesNo.Yes : YesNo.No;
}
