import { DoctorOkRejection, RecordStatus, type RecordDoctorOkResult } from '@stamina/contracts';
import { ReferralKind, ScreeningStatus } from '@stamina/domain';
import { and, eq, isNull } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { screening } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readLatestScreening } from './read-latest-screening.ts';
import { toSavedScreening } from './to-saved-screening.ts';

const rejected = (reason: DoctorOkRejection): RecordDoctorOkResult => ({
  status: RecordStatus.Rejected,
  reason,
});

/**
 * Records "a doctor has said I can train" on the latest Screening, which unlocks Limited mode.
 * Only a general referral can take it: a cleared or missing Screening is `NotReferred`, and
 * pregnancy has no Limited path. The first statement stamps `doctor_ok_at`; later ones change
 * nothing. Stamina records the statement, it never issues clearance.
 */
export async function recordDoctorOk(db: Db, userId: string): Promise<RecordDoctorOkResult> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    const latest = await readLatestScreening(tx, userId);
    if (latest === undefined || latest.status !== ScreeningStatus.Referred) {
      return rejected(DoctorOkRejection.NotReferred);
    }
    if (latest.referral !== ReferralKind.General) return rejected(DoctorOkRejection.Pregnancy);

    if (latest.doctorOkAt !== null) {
      return { status: RecordStatus.Saved, screening: toSavedScreening(latest) };
    }
    const [stamped] = await tx
      .update(screening)
      .set({ doctorOkAt: new Date() })
      .where(and(eq(screening.id, latest.id), isNull(screening.doctorOkAt)))
      .returning();
    return { status: RecordStatus.Saved, screening: toSavedScreening(stamped!) };
  });
}
