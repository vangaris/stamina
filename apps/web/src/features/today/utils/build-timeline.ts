import { WIND_DOWN_AT } from '../config.ts';
import { TimelineEntryKind } from '../enums/timeline-entry-kind.ts';
import type { TimelineEntry, TimelineInput } from '../types.ts';

/**
 * Today's timeline, one entry per line. Entries with a time of their own (meals, the wind-down)
 * are in time order. Entries without one (the Session, Activities, water) keep their source
 * order and come first, as a day's plan has no clock time for them yet. The wind-down at 22:30
 * is always there. Meals and water are drawn only when the input has them.
 */
export function buildTimeline({
  session,
  activities = [],
  water,
  meals = [],
}: TimelineInput): TimelineEntry[] {
  const untimed: TimelineEntry[] = [];
  if (session) {
    const key = `session-${session.id}`;
    untimed.push({ kind: TimelineEntryKind.Session, key, at: undefined, session });
  }
  for (const activity of activities) {
    const key = `activity-${activity.key}`;
    untimed.push({ kind: TimelineEntryKind.Activity, key, at: undefined, activity });
  }
  if (water) {
    untimed.push({ kind: TimelineEntryKind.Water, key: 'water', at: undefined, water });
  }

  const timed: TimelineEntry[] = meals.map((meal): TimelineEntry => ({
    kind: TimelineEntryKind.MealSlot,
    key: `meal-${meal.id}`,
    at: meal.at,
    meal,
  }));
  timed.push({ kind: TimelineEntryKind.WindDown, key: 'wind-down', at: WIND_DOWN_AT });
  timed.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));

  return [...untimed, ...timed];
}
