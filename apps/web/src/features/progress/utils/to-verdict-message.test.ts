import { VerdictKind } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { makeProgress } from '../testing/make-progress.ts';
import { toVerdictMessage } from './to-verdict-message.ts';

describe('toVerdictMessage', () => {
  it('keys the sentence by the verdict kind and fills in the numbers', () => {
    const verdict = makeProgress().verdict;

    expect(
      toVerdictMessage({ ...verdict, kind: VerdictKind.AboveUsual, average: 1840 }, Locale.En),
    ).toEqual({
      key: 'progress.verdict.above-usual',
      params: {
        average: '1,840',
        sessionsDone: verdict.sessionsDone,
        sessionsPlanned: verdict.sessionsPlanned,
      },
    });
  });

  it('writes the usual in Greek number format', () => {
    const verdict = makeProgress().verdict;

    expect(toVerdictMessage({ ...verdict, average: 1840 }, Locale.El).params.average).toBe('1.840');
  });

  it('has a key for every kind of verdict', () => {
    const verdict = makeProgress().verdict;

    for (const kind of Object.values(VerdictKind)) {
      expect(toVerdictMessage({ ...verdict, kind }, Locale.En).key).toBe(
        `progress.verdict.${kind}`,
      );
    }
  });

  it('leaves the usual empty while there is none', () => {
    const verdict = makeProgress().verdict;

    expect(
      toVerdictMessage({ ...verdict, kind: VerdictKind.NotEnoughHistory, average: null }, Locale.En)
        .params.average,
    ).toBe('');
  });
});
