import {
  AiUnavailableError,
  createAiGateway,
  createAnthropicProvider,
  unavailableAiProvider,
} from '../src/ai/index.ts';
import { createPgDb } from '../src/db/pg-client.ts';
import { DRAFT_OVERWRITE_FLAG, draftSportProfile, SportDraftError } from '../src/sports/node.ts';

/**
 * Drafts the profile of one draft sport: `DATABASE_URL=... ANTHROPIC_API_KEY=... pnpm --filter @stamina/api sports:draft <sport-id> [--overwrite]`.
 * A draft that already has a profile is refused unless `--overwrite` is given.
 * Run locally by the founder; the draft is reviewed and approved by hand afterwards
 * (`docs/sport-profile-review.md`). The call goes through the AI gateway, so it is logged in
 * `llm_call` and counts toward the monthly spend. Without `ANTHROPIC_API_KEY` (Phase A) the
 * provider is the "unavailable" one and the script exits with a message. Problems go to stderr
 * with a non-zero exit.
 */
function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is required');
const args = process.argv.slice(2);
const overwrite = args.includes(DRAFT_OVERWRITE_FLAG);
const sportId = args.find((arg) => arg !== DRAFT_OVERWRITE_FLAG);
if (!sportId) fail(`usage: sports:draft <sport-id> [${DRAFT_OVERWRITE_FLAG}]`);

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const provider = apiKey ? createAnthropicProvider({ apiKey }) : unavailableAiProvider;

const { db, close } = createPgDb(url);
try {
  await draftSportProfile(db, createAiGateway(db, { provider }), sportId, { overwrite });
  console.log(`Drafted "${sportId}". Review it, then approve it (docs/sport-profile-review.md).`);
} catch (error) {
  if (error instanceof AiUnavailableError) {
    fail('ANTHROPIC_API_KEY is not set (Phase A runs without AI), so nothing was drafted.');
  }
  if (error instanceof SportDraftError) fail(error.message);
  throw error;
} finally {
  await close();
}
