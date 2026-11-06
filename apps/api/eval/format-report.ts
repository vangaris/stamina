import { PASS_RATE_THRESHOLD } from './config.ts';
import type { EvalReport } from './types.ts';

export const passRate = (results: readonly { failure: string | null }[]): number =>
  results.length === 0
    ? 0
    : results.filter(({ failure }) => failure === null).length / results.length;

const percent = (rate: number): string => `${(rate * 100).toFixed(1)} %`;

/** Whether the report meets the bar. A harness report never fails: it measures no model. */
export function meetsThreshold(report: EvalReport): boolean {
  return !report.measuresModel || passRate(report.results) >= PASS_RATE_THRESHOLD;
}

/** The report as Markdown, for the console and the CI job summary. */
export function formatReport(report: EvalReport): string {
  const rate = passRate(report.results);
  const locales = [...new Set(report.results.map(({ locale }) => locale))].sort();
  const failures = report.results.filter(({ failure }) => failure !== null);
  const cost = report.results.reduce((sum, { costMicroUsd }) => sum + costMicroUsd, 0);
  return [
    `## Session picks evaluation (${report.promptVersion})`,
    '',
    `Provider: ${report.provider}, model: ${report.model}`,
    ...(report.measuresModel
      ? []
      : [
          '',
          '> No `ANTHROPIC_API_KEY`: the offline harness answered. This checks the harness, prompt',
          '> builder and validators only. It says nothing about a model and cannot fail the job.',
        ]),
    '',
    `| Locale | Cases | Valid first answers | Pass rate |`,
    `| --- | ---: | ---: | ---: |`,
    ...locales.map((locale) => {
      const own = report.results.filter((result) => result.locale === locale);
      return `| ${locale} | ${own.length} | ${own.filter((r) => r.failure === null).length} | ${percent(passRate(own))} |`;
    }),
    `| **all** | ${report.results.length} | ${report.results.length - failures.length} | **${percent(rate)}** |`,
    '',
    `Bar: ${percent(PASS_RATE_THRESHOLD)}. ${meetsThreshold(report) ? 'Met.' : 'NOT met.'} Cost: ${(cost / 1_000_000).toFixed(6)} USD.`,
    ...(failures.length === 0
      ? []
      : ['', 'Failures:', ...failures.map(({ id, failure }) => `- ${id}: ${failure}`)]),
    '',
  ].join('\n');
}
