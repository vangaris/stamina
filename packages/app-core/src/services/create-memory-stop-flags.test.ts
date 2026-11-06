import type { ReportStopFlag } from '@stamina/contracts';
import { StopFlag } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { createMemoryStopFlags } from './create-memory-stop-flags.ts';

const REPORTED_AT = '2026-11-06T10:00:00.000Z';

const report = (id: string): ReportStopFlag => ({ id, flag: StopFlag.Fever, date: '2026-11-06' });

describe('createMemoryStopFlags', () => {
  it('lists what was added, once per id, keeping the first reportedAt', async () => {
    const flags = createMemoryStopFlags();
    await flags.add(report('a'), REPORTED_AT);
    await flags.add(report('a'), 'later');
    await flags.add(report('b'), REPORTED_AT);

    expect(await flags.list()).toEqual([
      { report: report('a'), reportedAt: REPORTED_AT },
      { report: report('b'), reportedAt: REPORTED_AT },
    ]);
  });

  it('removes by id and clears everything', async () => {
    const flags = createMemoryStopFlags();
    await flags.add(report('a'), REPORTED_AT);
    await flags.add(report('b'), REPORTED_AT);
    await flags.remove('a');
    await flags.remove('unknown');

    expect((await flags.list()).map((row) => row.report.id)).toEqual(['b']);

    flags.clear();
    expect(await flags.list()).toEqual([]);
  });
});
