import { and, desc, eq, notExists } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { block, program, session } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import type { BlockRow, SessionRow } from './types.ts';

/**
 * The user's latest Block with the Sessions of its latest week that are current: the rows no
 * other row supersedes, so a revision shows and the revision it replaced does not. `null` before
 * the Program exists. Reads as the app role, so row-level security keeps it to the user's own rows.
 */
export async function readCurrentWeek(
  tx: UserTx,
  userId: string,
): Promise<{ block: BlockRow; sessions: SessionRow[] } | null> {
  const [found] = await tx
    .select({ block })
    .from(program)
    .innerJoin(block, eq(block.programId, program.id))
    .where(eq(program.userId, userId))
    .orderBy(desc(block.position))
    .limit(1);
  if (found === undefined) return null;

  const newer = alias(session, 'newer');
  const current = await tx
    .select()
    .from(session)
    .where(
      and(
        eq(session.blockId, found.block.id),
        notExists(
          tx.select({ one: newer.id }).from(newer).where(eq(newer.supersedesId, session.id)),
        ),
      ),
    );
  if (current.length === 0) return null;
  const week = Math.max(...current.map((row) => row.weekInBlock));
  return { block: found.block, sessions: current.filter((row) => row.weekInBlock === week) };
}
