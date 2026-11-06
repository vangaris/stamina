import type { Equipment, Goal, PickedExercise, SportMovement } from '@stamina/domain';

/**
 * Everything about the person the prompt may carry, besides the Session's own slots and
 * candidates: their Goal, the equipment they have, and the key movements of their sport.
 * Nothing else about them (no identity, age, sex, weight, Check-in, Screening or stop flag)
 * has a field here, so nothing else can reach a prompt.
 */
export interface SessionPicksContext {
  goal: Goal;
  equipment: readonly Equipment[];
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
