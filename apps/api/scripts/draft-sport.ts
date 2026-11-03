import { AiUnavailableError, unavailableAiProvider } from '../src/ai/provider.ts';
import { createPgDb } from '../src/db/pg-client.ts';
import { draftSportProfile, SportDraftError } from '../src/sports/node.ts';

/**
 * Drafts the profile of one draft sport: `DATABASE_URL=... pnpm --filter @stamina/api sports:draft <sport-id> [--overwrite]`.
 * A draft that already has a profile is refused unless `--overwrite` is given.
 * Run locally by the founder; the draft is reviewed and approved by hand afterwards
 * (`docs/sport-profile-review.md`). Problems go to stderr with a non-zero exit.
 * Phase A has no AI provider (ticket 10 adds Anthropic), so this exits with a message until then.
 */
function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is required');
const args = process.argv.slice(2);
const overwrite = args.includes('--overwrite');
const sportId = args.find((arg) => arg !== '--overwrite');
if (!sportId) fail('usage: sports:draft <sport-id> [--overwrite]');

const { db, close } = createPgDb(url);
try {
  await draftSportProfile(db, unavailableAiProvider, sportId, { overwrite });
  console.log(`Drafted "${sportId}". Review it, then approve it (docs/sport-profile-review.md).`);
} catch (error) {
  if (error instanceof AiUnavailableError) {
    fail('No AI provider is configured yet (Phase B, ticket 10), so nothing was drafted.');
  }
  if (error instanceof SportDraftError) fail(error.message);
  throw error;
} finally {
  await close();
}
