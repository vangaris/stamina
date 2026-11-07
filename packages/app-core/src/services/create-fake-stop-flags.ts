import {
  RecordStatus,
  type ConfirmDoctorSeen,
  type ConfirmDoctorSeenResult,
  type ExportedStopFlag,
  type ReportStopFlag,
  type ReportStopFlagResult,
} from '@stamina/contracts';
import { resolveStopState, type StopState } from '@stamina/domain';

/**
 * What the fake API remembers of stop flags, with the server's rules: append-only and idempotent
 * by id (a replay is `recorded: false`); the only change to a stored flag is `confirmedAt`, set
 * once, by `confirm` on the open pausing flags of the kinds given. The state is
 * `resolveStopState` over all of them.
 */
export function createFakeStopFlags() {
  const flags = new Map<string, ExportedStopFlag[]>();
  const read = (userId: string) => flags.get(userId) ?? [];
  const stateOf = (userId: string): StopState => resolveStopState(read(userId));
  return {
    /** Everything reported by the user, oldest first (the data export). */
    all: read,
    /** The user's stop state: pauses, rest day and excluded areas. */
    state: stateOf,
    /** Account deletion. */
    forget(userId: string): void {
      flags.delete(userId);
    },
    report(userId: string, report: ReportStopFlag): ReportStopFlagResult {
      const recorded = !read(userId).some(({ id }) => id === report.id);
      if (recorded) {
        flags.set(userId, [
          ...read(userId),
          {
            id: report.id,
            flag: report.flag,
            date: report.date,
            area: report.bodyArea ?? null,
            sessionId: report.sessionId ?? null,
            reportedAt: new Date().toISOString(),
            confirmedAt: null,
          },
        ]);
      }
      return { status: RecordStatus.Saved, recorded, stop: stateOf(userId) };
    },
    confirm(userId: string, { flags: kinds }: ConfirmDoctorSeen): ConfirmDoctorSeenResult {
      const now = new Date().toISOString();
      flags.set(
        userId,
        read(userId).map((stored) =>
          stored.confirmedAt === null &&
          kinds.includes(stored.flag) &&
          resolveStopState([stored]).pausing.length > 0
            ? { ...stored, confirmedAt: now }
            : stored,
        ),
      );
      return { status: RecordStatus.Saved, stop: stateOf(userId) };
    },
  };
}
