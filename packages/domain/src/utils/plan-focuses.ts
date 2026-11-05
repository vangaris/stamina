import { FOCUS_SEQUENCE } from '../config.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import type { PlanFocusesInput } from '../types.ts';
import { pickExercises } from './pick-exercises.ts';

/**
 * The focus of each Session of the week before placement, in order, one entry per Session.
 * The rule, in order:
 * 1. The wanted focuses are `FOCUS_SEQUENCE` cut to the Sessions per week (lower, upper, ...).
 * 2. A heavy focus is fillable when the library fills every slot of a Session with it for the
 *    person's equipment, excluded areas and Limited mode. Exercises used earlier in the week
 *    only affect ranking, never fillability.
 * 3. Every Session whose focus is not fillable becomes a `Recovery` Session: the Session count
 *    is never reduced and excluded areas are still honoured.
 * 4. When any Session is Recovery and the library cannot fill a Recovery Session either, the
 *    result is `null` (a half Session is never planned).
 * Pure and deterministic; the placement then works from this list, so a converted Session is
 * not heavy and the recovery-window rule does not apply to it.
 */
export function planFocuses({ sessionsPerWeek, ...pick }: PlanFocusesInput): SessionFocus[] | null {
  const fillable = new Map<SessionFocus, boolean>();
  const canFill = (focus: SessionFocus): boolean => {
    let result = fillable.get(focus);
    if (result === undefined) {
      result = pickExercises({ ...pick, focus, usedInWeek: new Set() }) !== null;
      fillable.set(focus, result);
    }
    return result;
  };

  const focuses: SessionFocus[] = FOCUS_SEQUENCE.slice(0, sessionsPerWeek).map((focus) =>
    canFill(focus) ? focus : SessionFocus.Recovery,
  );
  if (focuses.includes(SessionFocus.Recovery) && !canFill(SessionFocus.Recovery)) return null;
  return focuses;
}
