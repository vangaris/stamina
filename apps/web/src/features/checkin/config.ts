import { MAX_CHECKIN_SCORE, MIN_CHECKIN_SCORE } from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';
import { CheckinQuestionKey } from './enums/checkin-question-key.ts';
import { CheckinStatus } from './enums/checkin-status.ts';

/** The questions in the order they are asked. */
export const CHECKIN_QUESTIONS: readonly CheckinQuestionKey[] = [
  CheckinQuestionKey.Sleep,
  CheckinQuestionKey.Soreness,
  CheckinQuestionKey.Energy,
];

/** The chips of every question: 1 is the low end, the last is the high end. */
export const CHECKIN_SCORES: readonly number[] = Array.from(
  { length: MAX_CHECKIN_SCORE - MIN_CHECKIN_SCORE + 1 },
  (_, index) => MIN_CHECKIN_SCORE + index,
);

/** The card shows the done state in these. */
export const DONE_STATUSES: readonly CheckinStatus[] = [
  CheckinStatus.Saved,
  CheckinStatus.Queued,
  CheckinStatus.Answered,
];

/** The card shows a question in these. */
export const ASKING_STATUSES: readonly CheckinStatus[] = [
  CheckinStatus.Asking,
  CheckinStatus.Sending,
  CheckinStatus.Failed,
];

export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;
