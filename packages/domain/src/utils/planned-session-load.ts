import { BLOCK_RIR_BY_WEEK, FAILURE_RPE } from '../config.ts';
import { sessionLoad } from './session-load.ts';

/**
 * The Load a Session not done yet is expected to add: the effort its week of the Block asks for
 * (`FAILURE_RPE` minus that week's reps in reserve) times its minutes. An estimate for the
 * planned part of the weekly bars; the Load that counts is the one the person rates when they
 * finish.
 */
export function plannedSessionLoad(weekInBlock: number, minutes: number): number {
  return sessionLoad(FAILURE_RPE - BLOCK_RIR_BY_WEEK[weekInBlock - 1]!, minutes);
}
