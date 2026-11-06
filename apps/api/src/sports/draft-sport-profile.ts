import { sportDraftSchema } from '@stamina/contracts';
import { SportStatus } from '@stamina/domain';
import { and, eq, isNull } from 'drizzle-orm';
import { AiCallStatus, AiPurpose, AiUnavailableError, type AiGateway } from '../ai/index.ts';
import { sport } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { buildSportDraftPrompt } from './build-sport-draft-prompt.ts';
import { SportDraftError } from './sport-draft-error.ts';
import type { DraftSportProfileOptions } from './types.ts';

/**
 * Drafts a profile with cited sources for one DRAFT sport and stores it on that row. Never
 * changes the status and never approves: the founder reviews the draft and approves it by hand
 * (`docs/sport-profile-review.md`). Refuses a sport that does not exist or is not a draft, so an
 * approved profile is never overwritten, and a draft that already has a profile unless `overwrite`.
 * The model is asked from the sport's name only, through the gateway, so the call is logged and
 * counts toward the monthly spend (it has no user, so no daily cap applies). No provider throws
 * `AiUnavailableError`; a failed call, a switched-off model or an invalid model output throws
 * `SportDraftError`; nothing is stored in any of those cases. Run as the table owner (the
 * founder's script); the app role cannot write `sport`.
 */
export async function draftSportProfile(
  db: Db,
  ai: AiGateway,
  sportId: string,
  { overwrite = false }: DraftSportProfileOptions = {},
): Promise<void> {
  const [row] = await db.select().from(sport).where(eq(sport.id, sportId));
  if (!row) throw new SportDraftError(`No sport "${sportId}".`);
  if (row.status !== SportStatus.Draft) {
    throw new SportDraftError(`Sport "${sportId}" is ${row.status}; only a draft can be drafted.`);
  }
  if (row.profile !== null && !overwrite) {
    throw new SportDraftError(
      `Sport "${sportId}" already has a profile; pass overwrite to replace it.`,
    );
  }

  const result = await ai.run({
    userId: null,
    request: {
      purpose: AiPurpose.SportDraft,
      prompt: buildSportDraftPrompt(row.name),
      schema: sportDraftSchema,
    },
  });
  if (result.status === AiCallStatus.Unavailable) throw new AiUnavailableError();
  if (result.status !== AiCallStatus.Accepted) {
    throw new SportDraftError(
      `The AI did not produce a draft for "${sportId}" (${result.status}).`,
    );
  }
  const draft = result.object;

  // The status (and, without overwrite, the empty profile) is part of the condition: a sport
  // approved or drafted by hand while the model was thinking is not touched.
  const updated = await db
    .update(sport)
    .set({ profile: draft.profile, sources: draft.sources })
    .where(
      and(
        eq(sport.id, sportId),
        eq(sport.status, SportStatus.Draft),
        overwrite ? undefined : isNull(sport.profile),
      ),
    )
    .returning({ id: sport.id });
  if (updated.length === 0) {
    throw new SportDraftError(`Sport "${sportId}" is no longer an open draft; nothing was stored.`);
  }
}
