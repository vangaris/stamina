import type { Adaptation } from '@stamina/contracts';
import { AdaptationChangeKind, BodyArea, Weekday } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { CHANGE_MESSAGE_KEYS } from '../config.ts';
import { SESSION_ID } from '../testing/make-adaptation.ts';
import { toChangeMessage } from './to-change-message.ts';

const label = (weekday: Weekday) => `<${weekday}>`;

describe('toChangeMessage', () => {
  it('names the days a Session moves between, in the weekday names given', () => {
    expect(
      toChangeMessage(
        {
          kind: AdaptationChangeKind.MoveSession,
          sessionId: SESSION_ID,
          from: '2026-11-05',
          to: '2026-11-06',
        },
        label,
      ),
    ).toEqual({
      key: 'adaptation.change.move-session',
      params: { from: '<thu>', to: '<fri>' },
    });
  });

  it('names the day a repeated week or a new Block starts', () => {
    expect(
      toChangeMessage(
        { kind: AdaptationChangeKind.RepeatWeek, startsOn: '2026-11-08', weekInBlock: 2 },
        label,
      ),
    ).toEqual({ key: 'adaptation.change.repeat-week', params: { day: '<sun>' } });
    expect(
      toChangeMessage({ kind: AdaptationChangeKind.RestartBlock, startsOn: '2026-11-09' }, label),
    ).toEqual({ key: 'adaptation.change.restart-block', params: { day: '<mon>' } });
  });

  const changes: Adaptation['change'][] = [
    { kind: AdaptationChangeKind.SwapToRecovery, sessionId: SESSION_ID },
    { kind: AdaptationChangeKind.DropSet, sessionId: SESSION_ID },
    { kind: AdaptationChangeKind.LightenSession, sessionId: SESSION_ID },
    {
      kind: AdaptationChangeKind.SwapExercises,
      sessionId: SESSION_ID,
      areas: [BodyArea.Knee],
    },
    { kind: AdaptationChangeKind.DeloadWeek, sessionIds: [SESSION_ID] },
  ];

  it.each(changes)('uses the message of its kind, with no arguments: $kind', (change) => {
    expect(toChangeMessage(change, label)).toEqual({
      key: CHANGE_MESSAGE_KEYS[change.kind],
      params: {},
    });
  });
});
