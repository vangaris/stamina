import { readFileSync } from 'node:fs';
import { PickProblem } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { AiCallError, AiCallFailure, type AiProvider } from '../src/ai/index.ts';
import { EXERCISE_DATA_DIR, loadExerciseLibrary } from '../src/exercises/node.ts';
import { SESSION_PICKS_CASES_FILE } from '../eval/config.ts';
import { evalCasesSchema } from '../eval/eval-case-schema.ts';
import { EvalProvider } from '../eval/enums/eval-provider.ts';
import { formatReport } from '../eval/format-report.ts';
import { harnessProvider } from '../eval/harness-provider.ts';
import { meetsThreshold } from '../eval/meets-threshold.ts';
import { passRate } from '../eval/pass-rate.ts';
import { runSessionPicksEval } from '../eval/run-session-picks-eval.ts';
import type { EvalReport } from '../eval/types.ts';

const cases = evalCasesSchema.parse(JSON.parse(readFileSync(SESSION_PICKS_CASES_FILE, 'utf8')));
const library = await loadExerciseLibrary(EXERCISE_DATA_DIR);

const reportOf = async (provider: AiProvider, measuresModel: boolean): Promise<EvalReport> => {
  const run = await runSessionPicksEval(cases, library, provider);
  return { provider: EvalProvider.Harness, measuresModel, ...run };
};

describe('the evaluation set', () => {
  it('has English and Greek cases, and the library can build a Session for every one', async () => {
    expect(new Set(cases.map(({ locale }) => locale))).toEqual(new Set(['en', 'el']));
    const { results } = await reportOf(harnessProvider, false);
    expect(results).toHaveLength(cases.length);
  });

  it('passes every case for answers that take candidates, and says the harness measures no model', async () => {
    const report = await reportOf(harnessProvider, false);
    expect(passRate(report.results)).toBe(1);
    expect(meetsThreshold(report)).toBe(true);
    expect(formatReport(report)).toContain('says nothing about a model');
  });

  it('counts an invalid first answer as a failure with its problem, per locale', async () => {
    // Every answer repeats its first exercise in place of the second: a duplicate in the Session.
    const sloppy: AiProvider = {
      available: true,
      async generateObject(request) {
        const { object, ...rest } = await harnessProvider.generateObject(request);
        const picks = (object as { picks: { exerciseId: string }[] }).picks;
        const repeated = picks.map((pick, i) =>
          i === 1 ? { ...pick, exerciseId: picks[0]!.exerciseId } : pick,
        );
        return { ...rest, object: { picks: repeated } as typeof object };
      },
    };
    const report = await reportOf(sloppy, true);

    expect(
      report.results.every(
        ({ failure }) => failure === PickProblem.Duplicate || failure === PickProblem.NotACandidate,
      ),
    ).toBe(true);
    expect(passRate(report.results)).toBe(0);
    expect(meetsThreshold(report)).toBe(false);
    const text = formatReport(report);
    expect(text).toContain('NOT met');
    expect(text).toMatch(/\| en \| 6 \| 0 \| 0.0 % \|/);
  });

  it('counts a failed call as a failure with its cause and cost', async () => {
    const down: AiProvider = {
      available: true,
      async generateObject() {
        throw new AiCallError(AiCallFailure.Http, 'm', {
          inputTokens: 1,
          outputTokens: 1,
          costMicroUsd: 7,
        });
      },
    };
    const report = await reportOf(down, true);
    expect(
      report.results.every(({ failure, costMicroUsd }) => failure === 'http' && costMicroUsd === 7),
    ).toBe(true);
    expect(meetsThreshold(report)).toBe(false);
  });

  it('meets the bar at exactly 98 % and not below', () => {
    const results = (valid: number, total: number): EvalReport['results'] =>
      Array.from({ length: total }, (_, i) => ({
        id: String(i),
        locale: cases[0]!.locale,
        focus: cases[0]!.focus,
        failure: i < valid ? null : PickProblem.WrongCount,
        costMicroUsd: 0,
      }));
    const base = {
      provider: EvalProvider.Anthropic,
      model: 'm',
      promptVersion: 'v',
      measuresModel: true,
    };
    expect(meetsThreshold({ ...base, results: results(49, 50) })).toBe(true);
    expect(meetsThreshold({ ...base, results: results(48, 50) })).toBe(false);
  });
});
