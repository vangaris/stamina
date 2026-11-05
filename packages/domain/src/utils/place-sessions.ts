import { HOURS_PER_DAY, WEEKDAY_ORDER } from '../config.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import type { PlacedSession, PlacementInput } from '../types.ts';
import { arrangements } from './arrangements.ts';
import { combinations } from './combinations.ts';

interface Day {
  /** Position in the week, 0 is the first day. */
  position: number;
  /** Position in the Monday-first weekday order, used to break ties. */
  weekdayRank: number;
  available: boolean;
  hard: boolean;
  /** Days from here to the next hard Activity this week; infinite when there is none. */
  daysToHard: number;
}

interface Placement {
  days: Day[];
  focuses: SessionFocus[];
  smallestGap: number;
}

interface SearchOptions {
  /** How many Sessions are Recovery Sessions; the rest are heavy lower or upper Sessions. */
  recoveryCount: number;
  /** Whether a Recovery Session may take a hard-Activity day. */
  recoveryOnHardDays: boolean;
  /** Rule 3: at least one day with no Session and no hard Activity. */
  requireFreeDay: boolean;
}

/** A larger smallest gap wins, then the earlier weekdays (Monday first), compared in turn. */
function isBetter(candidate: Placement, best: Placement | null): boolean {
  if (best === null || candidate.smallestGap !== best.smallestGap) {
    return best === null || candidate.smallestGap > best.smallestGap;
  }
  const mine = candidate.days.map((day) => day.weekdayRank).sort((a, b) => a - b);
  const theirs = best.days.map((day) => day.weekdayRank).sort((a, b) => a - b);
  for (let index = 0; index < mine.length; index += 1) {
    if (mine[index] !== theirs[index]) return mine[index]! < theirs[index]!;
  }
  return false;
}

/**
 * Exhaustive search over the day subsets and the focus orders (at most a few hundred), so the
 * result never depends on the order the answers arrived in. Keeps the first placement among equals.
 */
function search(
  days: readonly Day[],
  heavyPlan: readonly SessionFocus[],
  sessionsPerWeek: number,
  windows: PlacementInput['recoveryWindowHours'],
  { recoveryCount, recoveryOnHardDays, requireFreeDay }: SearchOptions,
): Placement | null {
  const heavyFocuses = heavyPlan.slice(0, sessionsPerWeek - recoveryCount);
  const orders = arrangements(heavyFocuses);
  const positions = Array.from({ length: sessionsPerWeek }, (_, index) => index);
  const heavyFits = (day: Day, focus: SessionFocus): boolean =>
    !day.hard &&
    day.daysToHard * HOURS_PER_DAY > (focus === SessionFocus.Lower ? windows.lower : windows.upper);

  let best: Placement | null = null;
  const candidateDays = days.filter((day) => day.available && (recoveryOnHardDays || !day.hard));
  for (const chosen of combinations(candidateDays, sessionsPerWeek)) {
    if (requireFreeDay && !days.some((day) => !day.hard && !chosen.includes(day))) continue;
    const smallestGap = Math.min(
      ...chosen.slice(1).map((day, index) => day.position - chosen[index]!.position),
    );
    for (const recoveryPositions of combinations(positions, recoveryCount)) {
      const heavyPositions = positions.filter((p) => !recoveryPositions.includes(p));
      for (const order of orders) {
        const focuses: SessionFocus[] = positions.map(() => SessionFocus.Recovery);
        heavyPositions.forEach((position, index) => {
          focuses[position] = order[index]!;
        });
        const fits = heavyPositions.every((position, index) =>
          heavyFits(chosen[position]!, order[index]!),
        );
        if (!fits) continue;
        const candidate = { days: chosen, focuses, smallestGap };
        if (isBetter(candidate, best)) best = candidate;
      }
    }
  }
  return best;
}

/**
 * Where the week's Sessions go. Pure and deterministic: the same answers always give the same
 * week. Rules, in order: no heavy Session for a body half inside its recovery window before the
 * next hard Activity (a lower Session needs more than `recoveryWindowHours.lower` hours, counted
 * in whole days, before it; only the next hard Activity of this week counts); no Session on a
 * hard-Activity day; at least one day with neither a Session nor a hard Activity; one Session a
 * day, so heavy upper and lower never share one. Among the placements that satisfy them all the
 * smallest gap between Sessions is as large as possible, then the earliest by weekday (Monday first).
 *
 * `focuses` are the Sessions the caller wants (heavy lower or upper, or Recovery where the library
 * cannot fill a heavy one); a Recovery entry is never made heavy.
 *
 * When no placement of heavy Sessions exists the Session count is never reduced. In order:
 * 1. The Sessions that cannot be placed become Recovery Sessions (no heavy work, so the recovery
 *    window does not apply) on available days that are not hard-Activity days, as few as possible.
 * 2. If there are not enough such days, Recovery Sessions may take an available hard-Activity day
 *    ("if it is the only day available it becomes a Recovery Session"), still keeping a free day.
 * 3. Only when every other day is taken or hard, the free-day rule gives way.
 */
export function placeSessions({
  focuses,
  availableDays,
  week,
  hardDays,
  recoveryWindowHours,
}: PlacementInput): PlacedSession[] {
  const sessionsPerWeek = focuses.length;
  const heavyPlan = focuses.filter((focus) => focus !== SessionFocus.Recovery);
  const plannedRecovery = sessionsPerWeek - heavyPlan.length;
  const days: Day[] = week.map(({ weekday }, position) => ({
    position,
    weekdayRank: WEEKDAY_ORDER.indexOf(weekday),
    available: availableDays.includes(weekday),
    hard: hardDays.includes(weekday),
    daysToHard: 0,
  }));
  for (const day of days) {
    const next = days.find((other) => other.position > day.position && other.hard);
    day.daysToHard = next === undefined ? Infinity : next.position - day.position;
  }

  const recoveryCounts = Array.from(
    { length: sessionsPerWeek - plannedRecovery + 1 },
    (_, index) => plannedRecovery + index,
  );
  const attempts: SearchOptions[] = [
    ...recoveryCounts.map((recoveryCount) => ({
      recoveryCount,
      recoveryOnHardDays: false,
      requireFreeDay: true,
    })),
    ...recoveryCounts
      .filter((recoveryCount) => recoveryCount >= 1)
      .map((recoveryCount) => ({
        recoveryCount,
        recoveryOnHardDays: true,
        requireFreeDay: true,
      })),
    ...recoveryCounts
      .filter((recoveryCount) => recoveryCount >= 1)
      .map((recoveryCount) => ({
        recoveryCount,
        recoveryOnHardDays: true,
        requireFreeDay: false,
      })),
  ];
  for (const options of attempts) {
    const placement = search(days, heavyPlan, sessionsPerWeek, recoveryWindowHours, options);
    if (placement !== null) {
      return placement.days.map((day, index) => ({
        ...week[day.position]!,
        focus: placement.focuses[index]!,
      }));
    }
  }
  return [];
}
