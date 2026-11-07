import {
  AdaptationRejection,
  ApiError,
  HttpStatus,
  RecordStatus,
  type AcceptAdaptation,
  type AcceptAdaptationResult,
  type Adaptation,
  type DeclineAdaptationResult,
  type ExportedAdaptation,
  type ProgramWeek,
} from '@stamina/contracts';
import { AdaptationStatus } from '@stamina/domain';
import type { FakeWeek } from '../types.ts';
import { applyFakeAdaptation } from '../utils/apply-fake-adaptation.ts';

/** What the fake API knows, per call, about the user's Program: the caller owns the week, the clock and the Session log. */
export interface FakeAdaptationContext {
  userId: string;
  /** Today, `YYYY-MM-DD` in UTC. */
  today: string;
  /** The user's stored week, if a Program was created. */
  week: FakeWeek | undefined;
  /** False once a set is logged for the Session or it is finished. */
  isUntouched: (sessionId: string) => boolean;
  /** The Program as the user would read it now. */
  program: () => ProgramWeek | null;
  /** Replaces the user's stored week after an accepted change; each replaced Session id maps to the id that replaces it. */
  commit: (week: FakeWeek, superseded: ReadonlyMap<string, string>) => void;
}

interface StoredAdaptation {
  adaptation: Adaptation;
  /** The fake only seeds one ask of a trigger, so the key is the id and the ask 1. */
  decision: { status: AdaptationStatus.Accepted | AdaptationStatus.Declined; at: string } | null;
}

const asDecided = ({ adaptation, decision }: StoredAdaptation): Adaptation => ({
  ...adaptation,
  status: decision?.status ?? AdaptationStatus.Pending,
  decidedAt: decision?.at ?? null,
});

/**
 * What the fake API remembers of Adaptations, with the server's rules: a stored suggestion never
 * changes, its decision is a separate answer; the pending list holds the undecided ones that are
 * still worth showing (`validUntil` not past) and whose basis Sessions are all current,
 * unfinished and unstarted, oldest first. Accepting echoes the basis: a differing basis, a
 * Session that moved on or a change that no longer applies is `Stale` with the latest Program
 * and decides nothing; a replay of the accept is `recorded: false`; declined already is
 * `AlreadyDecided`. Declining mirrors that. The fake raises no suggestions of its own: tests
 * (and the Dev mode) seed them with `seed`.
 */
export function createFakeAdaptations() {
  const stored = new Map<string, StoredAdaptation[]>();
  const read = (userId: string) => stored.get(userId) ?? [];

  const find = (userId: string, id: string): StoredAdaptation => {
    const row = read(userId).find(({ adaptation }) => adaptation.id === id);
    if (!row) throw new ApiError(HttpStatus.NotFound);
    return row;
  };

  /** Every Session in `basis` is in the week at that revision, and untouched. */
  const basisHolds = (basis: Adaptation['basis'], context: FakeAdaptationContext) =>
    basis.every(({ sessionId, revision }) =>
      context.week?.sessions.some(
        (session) =>
          session.id === sessionId &&
          session.revision === revision &&
          context.isUntouched(sessionId),
      ),
    );

  const sameBasis = (a: Adaptation['basis'], b: Adaptation['basis']) =>
    a.length === b.length &&
    a.every(({ sessionId, revision }) =>
      b.some((other) => other.sessionId === sessionId && other.revision === revision),
    );

  return {
    /** Stores a pending suggestion for the user (a test or Dev fixture); the fake raises none itself. */
    seed(userId: string, adaptation: Adaptation): void {
      stored.set(userId, [
        ...read(userId),
        {
          adaptation: { ...adaptation, status: AdaptationStatus.Pending, decidedAt: null },
          decision: null,
        },
      ]);
    },
    /** Account deletion. */
    forget(userId: string): void {
      stored.delete(userId);
    },
    /** Every suggestion, decided or not, oldest first (the data export). */
    all(userId: string): ExportedAdaptation[] {
      return read(userId).map((row) => ({
        ...asDecided(row),
        triggerKey: row.adaptation.id,
        ask: 1,
      }));
    },
    pending(context: FakeAdaptationContext): Adaptation[] {
      return read(context.userId)
        .filter(
          (row) =>
            row.decision === null &&
            (row.adaptation.validUntil === null || row.adaptation.validUntil >= context.today) &&
            basisHolds(row.adaptation.basis, context),
        )
        .map(asDecided);
    },
    accept(
      context: FakeAdaptationContext,
      id: string,
      { basis }: AcceptAdaptation,
    ): AcceptAdaptationResult {
      const row = find(context.userId, id);
      if (row.decision?.status === AdaptationStatus.Accepted) {
        return {
          status: RecordStatus.Saved,
          recorded: false,
          adaptation: asDecided(row),
          program: context.program()!,
        };
      }
      if (row.decision?.status === AdaptationStatus.Declined) {
        return {
          status: RecordStatus.Rejected,
          reason: AdaptationRejection.AlreadyDecided,
          program: context.program(),
        };
      }
      const stale = (): AcceptAdaptationResult => ({
        status: RecordStatus.Rejected,
        reason: AdaptationRejection.Stale,
        program: context.program(),
      });
      if (!context.week || !sameBasis(basis, row.adaptation.basis)) return stale();
      if (!basisHolds(row.adaptation.basis, context)) return stale();
      const applied = applyFakeAdaptation(context.week, row.adaptation.change, context.isUntouched);
      if (!applied) return stale();
      context.commit(applied.week, applied.superseded);
      row.decision = { status: AdaptationStatus.Accepted, at: new Date().toISOString() };
      return {
        status: RecordStatus.Saved,
        recorded: true,
        adaptation: asDecided(row),
        program: context.program()!,
      };
    },
    decline(userId: string, id: string): DeclineAdaptationResult {
      const row = find(userId, id);
      if (row.decision?.status === AdaptationStatus.Accepted) {
        return { status: RecordStatus.Rejected, reason: AdaptationRejection.AlreadyDecided };
      }
      const recorded = row.decision === null;
      row.decision ??= { status: AdaptationStatus.Declined, at: new Date().toISOString() };
      return { status: RecordStatus.Saved, recorded, adaptation: asDecided(row) };
    },
  };
}
