import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { E2E_DATABASE_URL } from './e2e-stack.ts';

const run = promisify(execFile);

/**
 * Issues fresh invite codes in the e2e database with the same script the team uses
 * (`pnpm --filter @stamina/api --silent invites:create <count>`, which prints only the codes,
 * one per line). Every test takes its own, so tests never share or burn each other's.
 */
export async function createInvites(count = 1): Promise<string[]> {
  const { stdout } = await run(
    'pnpm',
    ['--filter', '@stamina/api', '--silent', 'invites:create', String(count)],
    { env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL } },
  );
  const codes = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (codes.length !== count)
    throw new Error(`expected ${count} invite codes, got ${codes.length}`);
  return codes;
}
