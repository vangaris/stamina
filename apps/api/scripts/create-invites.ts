import { createDb } from '../src/db/client.ts';
import { invite } from '../src/db/schema.ts';
import { MAX_INVITES_PER_RUN } from '../src/invites/config.ts';
import { generateInviteCode } from '../src/invites/generate-invite-code.ts';

/**
 * Issues invite codes: `DATABASE_URL=... pnpm --filter @stamina/api --silent invites:create <count>`.
 * Prints exactly the new codes, one per line, on stdout and nothing else (the Playwright helper
 * reads them from there). Problems go to stderr with a non-zero exit.
 */
function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is required');
const count = Number(process.argv[2] ?? 1);
if (!Number.isInteger(count) || count < 1 || count > MAX_INVITES_PER_RUN) {
  fail(`usage: invites:create <count 1-${MAX_INVITES_PER_RUN}>`);
}

const { db, close } = createDb(url);
try {
  // A collision with an existing code is astronomically unlikely; `returning` still reports only
  // the codes that were actually inserted, and the loop tops up until `count` are.
  const created: string[] = [];
  while (created.length < count) {
    const rows = await db
      .insert(invite)
      .values(
        Array.from({ length: count - created.length }, () => ({ code: generateInviteCode() })),
      )
      .onConflictDoNothing()
      .returning({ code: invite.code });
    created.push(...rows.map((row) => row.code));
  }
  console.log(created.join('\n'));
} finally {
  await close();
}
