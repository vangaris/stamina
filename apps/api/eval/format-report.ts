import { MICRO_USD_PER_USD, PASS_RATE_THRESHOLD, REPORT_COST_DECIMALS } from './config.ts';
import { meetsThreshold } from './meets-threshold.ts';
import { passRate } from './pass-rate.ts';
import type { EvalReport } from './types.ts';

const percent = (rate: number): string => `${(rate * 100).toFixed(1)} %`;

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
    `Bar: ${percent(PASS_RATE_THRESHOLD)}. ${meetsThreshold(report) ? 'Met.' : 'NOT met.'} Cost: ${(cost / MICRO_USD_PER_USD).toFixed(REPORT_COST_DECIMALS)} USD.`,
    ...(failures.length === 0
      ? []
      : ['', 'Failures:', ...failures.map(({ id, failure }) => `- ${id}: ${failure}`)]),
    '',
  ].join('\n');
}
