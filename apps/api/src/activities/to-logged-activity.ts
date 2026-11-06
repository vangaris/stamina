import { SportKind, type LoggedActivity } from '@stamina/contracts';
import type { ActivityRow } from './types.ts';

/** A stored Activity row as the contract's `LoggedActivity`. */
export function toLoggedActivity(row: ActivityRow): LoggedActivity {
  return {
    id: row.id,
    sport:
      row.sportKind === SportKind.Launch
        ? { kind: SportKind.Launch, sport: row.launchSport! }
        : { kind: SportKind.Other, name: row.otherSportName! },
    date: row.date,
    minutes: row.minutes,
    intensity: row.intensity,
    hot: row.hot,
    rpe: row.rpe,
    load: row.load,
    planned: row.planned,
    source: row.source,
    loggedAt: row.loggedAt.toISOString(),
  };
}
