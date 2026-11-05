import { SessionSlot } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { SessionBlockKind } from '../enums/session-block-kind.ts';
import { makeExercise, makeSession } from '../testing/make-program.ts';
import { groupSessionBlocks } from './group-session-blocks.ts';

describe('groupSessionBlocks', () => {
  it('gives each slot its own block, in the order done', () => {
    const blocks = groupSessionBlocks(makeSession({ minutes: 45 }));

    expect(blocks.map(({ kind }) => kind)).toEqual([
      SessionBlockKind.WarmUp,
      SessionBlockKind.MainStrength,
      SessionBlockKind.SportSupport,
      SessionBlockKind.AccessoriesCore,
      SessionBlockKind.CoolDown,
    ]);
  });

  it('keeps several exercises of one slot together', () => {
    const session = makeSession({
      minutes: 60,
      exercises: [
        makeExercise({ slot: SessionSlot.MainStrength, exerciseId: 'a' }),
        makeExercise({ slot: SessionSlot.MainStrength, exerciseId: 'b' }),
      ],
    });

    const [block] = groupSessionBlocks(session);

    expect(block?.exercises.map(({ exerciseId }) => exerciseId)).toEqual(['a', 'b']);
  });

  it('merges sport-support and accessories into one block at 30 minutes', () => {
    const blocks = groupSessionBlocks(makeSession({ minutes: 30 }));

    expect(blocks.map(({ kind }) => kind)).toEqual([
      SessionBlockKind.WarmUp,
      SessionBlockKind.MainStrength,
      SessionBlockKind.SupportAccessories,
      SessionBlockKind.CoolDown,
    ]);
    expect(blocks[2]?.exercises).toHaveLength(2);
  });
});
