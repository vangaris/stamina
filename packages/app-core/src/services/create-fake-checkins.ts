import {
  RecordStatus,
  type Checkin,
  type SubmitCheckin,
  type SubmitCheckinResult,
} from '@stamina/contracts';

/**
 * What the fake API remembers of Check-ins, with the server's rules: append-only and idempotent
 * by id (a replay returns the stored one with `recorded: false`); no check on the date. The
 * latest is by day, then by when it was sent.
 */
export function createFakeCheckins() {
  const checkins = new Map<string, Checkin[]>();
  const read = (userId: string) => checkins.get(userId) ?? [];
  return {
    /** Everything submitted by the user, oldest first (the data export). */
    all: read,
    /** Account deletion. */
    forget(userId: string): void {
      checkins.delete(userId);
    },
    submit(userId: string, checkin: SubmitCheckin): SubmitCheckinResult {
      const existing = read(userId).find(({ id }) => id === checkin.id);
      if (existing) return { status: RecordStatus.Saved, recorded: false, checkin: existing };
      const stored: Checkin = { ...checkin, submittedAt: new Date().toISOString() };
      checkins.set(userId, [...read(userId), stored]);
      return { status: RecordStatus.Saved, recorded: true, checkin: stored };
    },
    latest(userId: string): Checkin | null {
      return read(userId).reduce<Checkin | null>(
        (latest, next) =>
          latest === null ||
          next.date > latest.date ||
          (next.date === latest.date && next.submittedAt >= latest.submittedAt)
            ? next
            : latest,
        null,
      );
    },
  };
}
