import type {
  Equipment,
  GeneratedWeek,
  Goal,
  LaunchSport,
  PickedExercise,
  SportMovement,
} from '@stamina/domain';
import type { z } from 'zod';
import type { sessionPicksSchema } from './picks-schema.ts';

/** What the model returns for one Session, as the schema parses it. */
export type SessionPicksAnswer = z.infer<typeof sessionPicksSchema>;

/**
 * Everything about the person the prompt may carry, besides the Session's own slots and
 * candidates: their Goal, the equipment they have, and their sport. Nothing else about them (no
 * identity, age, sex, weight, Check-in, Screening or stop flag) has a field here, so nothing else
 * can reach a prompt.
 */
export interface SessionPicksContext {
  goal: Goal;
  equipment: readonly Equipment[];
  /** The launch sport's id; `null` for a requested sport (its name is free text and never sent). */
  sport: LaunchSport | null;
  /** The sport's key movements; `null` while the sport has no Sport Profile. */
  sportMovements: readonly SportMovement[] | null;
}

/** A Session whose exercises the AI picked. */
export interface AiSessionPicks {
  /** In the order the Session does them; all valid against the spec they were picked from. */
  picks: PickedExercise[];
  /** The model's reason for each pick, by exercise id. */
  reasons: ReadonlyMap<string, string>;
  /** The model that answered. */
  model: string;
}

/** How a Session's picks were made, stored with it: `null` where the rules picker chose. */
export interface StoredPickInfo {
  model: string;
  promptVersion: string;
  reasons: ReadonlyMap<string, string>;
}

/** A week and, for each of its Sessions in order, how the AI picked it or `null` for the rules picker. */
export interface PickedWeek {
  week: GeneratedWeek;
  pickInfo: (StoredPickInfo | null)[];
}

export interface PickWeekOptions {
  /** The person's launch sport, if they play one; goes into the prompt. */
  sport?: LaunchSport | null;
  /** The clock in milliseconds; tests pass a fake. Defaults to `Date.now`. */
  now?: () => number;
  /** Defaults to `SESSION_PICKS_TIME_BUDGET_MS`. */
  budgetMs?: number;
}
