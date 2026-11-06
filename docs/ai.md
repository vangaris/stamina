# AI layer

What the model does, what it never sees, what it costs, and how it falls back. Spec: `.scratch/mvp-build/spec.md`, "AI layer". Code: `apps/api/src/ai` (provider, gateway), `apps/api/src/picks` (Session picks), `packages/domain` (`buildPickSpec`, `validatePicks`).

## Jobs today

- **Session exercise picks.** The rules (`generateWeek`) plan the week: dates, focus, slots, counts, sets, reps, RIR. The AI only chooses which exercise fills each slot, from the rules' candidate list for that slot (`buildPickSpec`: the equipment and excluded-area filter, Limited mode and the slot's own rules are already applied). One call per Session, in date order; each call is told which exercises the week already used.
- **Sport Profile draft** (`pnpm --filter @stamina/api sports:draft`): the founder's offline script. See [sport-profile-review.md](sport-profile-review.md).
- Meal ideas arrive with ticket 18.

## One door: the gateway

Every call goes through `createAiGateway` (`apps/api/src/ai/create-ai-gateway.ts`). In order:

1. No provider configured (`available: false`): `Unavailable`. No call, no log row.
2. The UTC month's spend is at or past 80 % of the $10 cap: `KillSwitch`. Everyone falls back to rules.
3. The person already made 15 calls this UTC day: `UserCapReached`.
4. The call runs. Whatever happens (accepted, refused by the caller's check, provider failure, unusable answer) one `llm_call` row is written: purpose, model, tokens, cost, outcome, a short detail code, and a pseudonym of the user.

A provider failure never escapes the gateway; the caller falls back. A failure to write the log row does escape: an unlogged call would break the spend count the kill switch relies on. Limits are in `apps/api/src/ai/config.ts`.

`llm_call` holds no user id: `user_pseudonym` is an HMAC of the id under a key derived from `SCREENING_ENCRYPTION_KEY` (`pseudonymize-user.ts`). It has no RLS policy and `stamina_app` has no grant, so only the API's own connection reads it. Rotating the Screening key changes every pseudonym, which resets the daily counts once.

## Prompts

A Session picks prompt (`apps/api/src/picks/build-picks-prompt.ts`) is fixed instructions plus one JSON data block: Goal, equipment, the sport's key movements, per slot its count and candidate ids, and the ids already used this week. `SessionPicksContext` has no field for anything else, so nothing else can reach a prompt: no user id, age, sex, weight, Check-in, Screening, stop flag, clearance statement or excluded area (an excluded area only shows as candidates that are missing). `test/ai-picks.test.ts` inspects the outgoing prompts of a Limited user with an excluded knee.

Change the prompt or `picks-schema.ts` and you change `SESSION_PICKS_PROMPT_VERSION`. Safety-critical: AI prompts and validators need Vang's sign-off note in the PR.

## Validation and fallback

`validatePicks` (domain) accepts an answer only if every id is a candidate of its own slot, every slot has exactly its count and no id appears twice. A refused answer or a failed call is retried once; after that the Session keeps the rules picker's exercises. `generateWeek` validates the chosen picks again before using them. Per-Session, so one bad answer never costs the others.

## Stored, never regenerated

A Session stores `model` and `prompt_version` (both null when the rules picked it); each AI-picked `session_exercise` stores the model's `pick_reason` (never shown). `POST /program` on an existing Program returns it with no model call. The API marks AI-picked exercises `suggestedByAi` and the web shows "Suggested by AI".

`createProgram` calls the model between two transactions, so no row lock is held while it answers. When the inputs changed meanwhile (for example a Screening saved), the picks are dropped and the rules' week for the new inputs is stored: a Program never outlives the exclusions it was built under.

## Switching it on

Phase A production runs the "unavailable" provider: no key, no card, rules only. Setting the Worker secret `ANTHROPIC_API_KEY` is the launch switch (Phase B; needs a card and a monthly cap at the provider, see [infra.md](infra.md)). The adapter (`create-anthropic-provider.ts`) uses the Messages API with `claude-haiku-5-5`, structured output (`output_config.format`) and low effort. It is tested against the documented request and response shapes with a stubbed `fetch`; it has not been run against the live API because no key exists yet. Do that first at launch: `ANTHROPIC_API_KEY=... pnpm --filter @stamina/api eval`.

## Evaluation set

`apps/api/eval/` holds cases (`cases/session-picks.json`, English and Greek personas) and a runner: `pnpm --filter @stamina/api eval`. It builds the real prompt for each case from the real exercise library, asks the model once and checks the first answer with the production validators. With `ANTHROPIC_API_KEY` it exits non-zero below 98 % valid; without it an offline harness answers and the report says it measures no model. `.github/workflows/prompt-eval.yml` runs it when a prompt, schema or the set changes and posts the pass rate in the job summary. The set has 12 cases; the spec's target is 50 (25 EN + 25 EL), to grow with the meal-idea prompts.
