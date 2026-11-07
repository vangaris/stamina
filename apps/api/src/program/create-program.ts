import { ProgramRejection, RecordStatus, type CreateProgramResult } from '@stamina/contracts';
import { generateWeek, type GeneratedWeek } from '@stamina/domain';
import type { AiGateway } from '../ai/index.ts';
import { lockUser } from '../db/lock-user.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { pickWeek, type StoredPickInfo } from '../picks/index.ts';
import { ProgramInputsStatus } from './enums/program-inputs-status.ts';
import { hashInputs } from './hash-inputs.ts';
import { readProgram } from './read-program.ts';
import { readProgramInputs } from './read-program-inputs.ts';
import { storeWeek } from './store-week.ts';

const rejected = (reason: ProgramRejection): CreateProgramResult => ({
  status: RecordStatus.Rejected,
  reason,
});

/**
 * Creates the signed-in user's Program (week 1 of Block 1) or says why not. One Program per
 * user: when it exists it is returned unchanged, with no AI call, so stored picks are never
 * regenerated. The rules generate the week; the AI then picks the exercises of each Session from
 * the rules' candidates, falling back to the rules' own choice per Session (`pickWeek`).
 *
 * Three steps, so no transaction and no row lock is held while the model answers: read what
 * exists and the inputs (transaction); pick (no transaction); lock the user, read the inputs
 * again and store (transaction). If the inputs changed in between (a Screening or stop flag saved while the
 * model was thinking), the AI's picks are dropped and the rules' week for the new inputs is
 * stored: a Program never outlives the exclusions it was built under. Two simultaneous calls
 * both pick; the second finds the first's Program under the lock and returns it.
 *
 * Refusals, in order: no saved profile, missing consent or no Screening (`NotReady`); a Referred
 * Training mode (`Referred`); a pausing stop flag not yet confirmed (`Paused`); food only (`NoTrainingWeek`); a library that cannot fill every slot
 * of every Session for the person's equipment and excluded areas (`NoExercises`). Nothing is
 * stored for a refusal.
 */
export async function createProgram(
  db: Db,
  gateway: AiGateway,
  userId: string,
  now: () => Date,
): Promise<CreateProgramResult> {
  const at = now();

  const first = await withUser(db, userId, async (tx) => {
    const existing = await readProgram(tx, userId);
    if (existing !== null) return { existing } as const;
    return { existing, inputs: await readProgramInputs(tx, userId, at) } as const;
  });
  if (first.existing !== null) return { status: RecordStatus.Saved, program: first.existing };
  const { inputs } = first;
  if (inputs.status === ProgramInputsStatus.Refused) return rejected(inputs.reason);

  const rulesWeek = generateWeek(inputs.input);
  if (rulesWeek === null) return rejected(ProgramRejection.NoExercises);
  const firstHash = await hashInputs(inputs.input);
  const picked = await pickWeek(gateway, userId, inputs.input, rulesWeek, { sport: inputs.sport });

  return withUser(db, userId, async (tx): Promise<CreateProgramResult> => {
    await lockUser(tx, userId);

    const existing = await readProgram(tx, userId);
    if (existing !== null) return { status: RecordStatus.Saved, program: existing };

    const current = await readProgramInputs(tx, userId, at);
    if (current.status === ProgramInputsStatus.Refused) return rejected(current.reason);
    const inputsHash = await hashInputs(current.input);

    let week: GeneratedWeek;
    let pickInfo: (StoredPickInfo | null)[];
    if (inputsHash === firstHash) {
      ({ week, pickInfo } = picked);
    } else {
      const fresh = generateWeek(current.input);
      if (fresh === null) return rejected(ProgramRejection.NoExercises);
      week = fresh;
      pickInfo = fresh.sessions.map(() => null);
    }

    await storeWeek(tx, userId, week, { inputsHash, beta: current.beta, pickInfo });
    const stored = await readProgram(tx, userId);
    if (stored === null) throw new Error('the Program just stored cannot be read back');
    return { status: RecordStatus.Saved, program: stored };
  });
}
