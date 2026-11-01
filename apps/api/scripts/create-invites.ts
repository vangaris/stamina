import { randomInt } from 'node:crypto';
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@stamina/domain';
import { createDb } from '../src/db/client.ts';
import { invite } from '../src/db/schema.ts';

/**
 * Issues invite codes: `DATABASE_URL=... pnpm --filter @stamina/api --silent invites:create <count>`.
 * Prints exactly the new codes, one per line, on stdout and nothing else (the Playwright helper
 * reads them from there). Problems go to stderr with a non-zero exit.
 */
const MAX_COUNT = 500;

function newCode(): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]!,
  ).join('');
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is required');
const count = Number(process.argv[2] ?? 1);
if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
  fail(`usage: invites:create <count 1-${MAX_COUNT}>`);
}

const { db, close } = createDb(url);
try {
  // A collision with an existing code is astronomically unlikely; `returning` still reports only
  // the codes that were actually inserted, and the loop tops up until `count` are.
  const created: string[] = [];
  while (created.length < count) {
    const rows = await db
      .insert(invite)
      .values(Array.from({ length: count - created.length }, () => ({ code: newCode() })))
      .onConflictDoNothing()
      .returning({ code: invite.code });
    created.push(...rows.map((row) => row.code));
  }
  console.log(created.join('\n'));
} finally {
  await close();
}
