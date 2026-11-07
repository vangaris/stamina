import {
  ApiError,
  HttpStatus,
  type ExportedWeighIn,
  type LogWeighIn,
  type LogWeighInResult,
  type Progress,
} from '@stamina/contracts';
import { DAYS_IN_WEEK, addDays, isWeighInDateInRange } from '@stamina/domain';

/**
 * What the fake API remembers of weigh-ins, with the server's rules: every one is kept (several
 * may share a day); the day defaults to today and must pass `isWeighInDateInRange` (a day ahead
 * to `MAX_WEIGH_IN_PAST_DAYS` back, else `ApiError` 400). The latest is by day, then by when it
 * was sent; one is due while none is dated in the week.
 */
export function createFakeWeighIns() {
  const weighIns = new Map<string, ExportedWeighIn[]>();
  const read = (userId: string) => weighIns.get(userId) ?? [];
  return {
    /** Everything logged by the user, oldest first (the data export). */
    all: read,
    /** Account deletion. */
    forget(userId: string): void {
      weighIns.delete(userId);
    },
    log(userId: string, today: string, entry: LogWeighIn): LogWeighInResult {
      const date = entry.date ?? today;
      if (!isWeighInDateInRange(today, date)) {
        throw new ApiError(HttpStatus.BadRequest);
      }
      const stored: ExportedWeighIn = {
        id: crypto.randomUUID(),
        date,
        weightKg: entry.weightKg,
        loggedAt: new Date().toISOString(),
      };
      weighIns.set(userId, [...read(userId), stored]);
      return { date, weightKg: entry.weightKg };
    },
    status(userId: string, weekStartsOn: string): Progress['weighIn'] {
      const endsBefore = addDays(weekStartsOn, DAYS_IN_WEEK);
      const mine = read(userId);
      const latest = mine.reduce<ExportedWeighIn | null>(
        (best, next) =>
          best === null ||
          next.date > best.date ||
          (next.date === best.date && next.loggedAt >= best.loggedAt)
            ? next
            : best,
        null,
      );
      return {
        latest: latest === null ? null : { date: latest.date, weightKg: latest.weightKg },
        due: !mine.some(({ date }) => date >= weekStartsOn && date < endsBefore),
      };
    },
  };
}
