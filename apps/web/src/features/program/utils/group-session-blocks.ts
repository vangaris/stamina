import type { ProgramSession } from '@stamina/contracts';
import { SessionSlot } from '@stamina/domain';
import { MERGED_BLOCK_MINUTES } from '../config.ts';
import { SessionBlockKind } from '../enums/session-block-kind.ts';
import type { SessionBlock } from '../types.ts';

const KIND_FOR_SLOT: Record<SessionSlot, SessionBlockKind> = {
  [SessionSlot.WarmUp]: SessionBlockKind.WarmUp,
  [SessionSlot.MainStrength]: SessionBlockKind.MainStrength,
  [SessionSlot.SportSupport]: SessionBlockKind.SportSupport,
  [SessionSlot.AccessoriesCore]: SessionBlockKind.AccessoriesCore,
  [SessionSlot.CoolDown]: SessionBlockKind.CoolDown,
};

const MERGED_SLOTS: readonly SessionSlot[] = [
  SessionSlot.SportSupport,
  SessionSlot.AccessoriesCore,
];

/**
 * A Session's exercises in the blocks the person reads, in the order done. Every slot keeps its
 * own block, except in a 30-minute Session where sport-support and accessories share one.
 */
export function groupSessionBlocks({ exercises, minutes }: ProgramSession): SessionBlock[] {
  const merge = minutes === MERGED_BLOCK_MINUTES;
  const blocks: SessionBlock[] = [];
  for (const exercise of exercises) {
    const kind =
      merge && MERGED_SLOTS.includes(exercise.slot)
        ? SessionBlockKind.SupportAccessories
        : KIND_FOR_SLOT[exercise.slot];
    const last = blocks.at(-1);
    if (last?.kind === kind) last.exercises.push(exercise);
    else blocks.push({ kind, exercises: [exercise] });
  }
  return blocks;
}
