import { appendFileSync, readFileSync } from 'node:fs';
import { loadExerciseLibrary } from '../src/exercises/node.ts';
import { createAnthropicProvider } from '../src/ai/index.ts';
import { SESSION_PICKS_CASES_FILE } from './config.ts';
import { evalCasesSchema } from './eval-case-schema.ts';
import { formatReport, meetsThreshold } from './format-report.ts';
import { harnessProvider } from './harness-provider.ts';
import { runSessionPicksEval } from './run-session-picks-eval.ts';
import type { EvalReport } from './types.ts';

/**
 * Runs the evaluation set: `pnpm --filter @stamina/api eval`. With `ANTHROPIC_API_KEY` it asks the
 * real model once per case and exits non-zero when fewer than 98 % of first answers pass the
 * validators; without it the offline harness answers, the report says so, and the exit is 0.
 * Prints the report and, under GitHub Actions, appends it to the job summary.
 */
const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const provider = apiKey ? createAnthropicProvider({ apiKey }) : harnessProvider;

const cases = evalCasesSchema.parse(JSON.parse(readFileSync(SESSION_PICKS_CASES_FILE, 'utf8')));
const { results, model, promptVersion } = await runSessionPicksEval(
  cases,
  await loadExerciseLibrary(),
  provider,
);
const report: EvalReport = {
  provider: apiKey ? 'anthropic' : 'harness',
  model,
  promptVersion,
  measuresModel: Boolean(apiKey),
  results,
};
console.log(formatReport(report));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatReport(report));
}
process.exit(meetsThreshold(report) ? 0 : 1);
