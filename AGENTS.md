# Stamina

AI coach that plans training, food and recovery around the sport a user plays. Greenfield MVP build, driven by tickets.

## Where the truth lives

- **Vocabulary**: `GLOSSARY.md`. Use its terms in code, tickets and copy.
- **Build spec**: `.scratch/mvp-build/spec.md`. Read before any implementation ticket.
- **Build tickets**: `.scratch/mvp-build/issues/NN-*.md`.
- **Why a decision was made**: the closed decision tickets in `.scratch/mvp-plan/issues/`, linked from `docs/mvp-plan.md`. Read the matching ticket before changing a decided behaviour.
- **Tracker conventions**: `docs/agents/issue-tracker.md`.

## Each implementation session

1. **Pick the ticket.** Use the one the user named. Otherwise take the lowest-numbered ticket whose `Status` is `ready-for-agent` and whose `Blocked by` tickets are all `done`.
2. **Claim it.** Set `Status: in-progress` in the ticket file and commit, before writing code.
3. **Branch.** Create `feat/NN-slug` from `main`.
4. **Implement** with `/implement`, test-first at the agreed seams.
5. **Finish.** The ticket is done when every acceptance-criterion box is ticked, the full test suite and typecheck are green, and `/code-review` has run.
6. **Close it.** Set `Status: done`. Squash-merge to `main` with a Conventional title: `feat: NN <ticket title>`.
7. **Report** the next frontier ticket.

## Rules that are easy to break

- **Test seams**: API over HTTP (real Hono app + Postgres, fake AI provider), the `app-core` mediator with mock services, and a few Playwright journeys. Test domain rules through the API seam, never as isolated units.
- **Client layering**: container → one composable → `mediator.send()` → pipeline → handler → services from `createServices(env)`. Stores hold state only. `app-core` and `domain` stay free of Vue and React.
- **Packages**: one per UI component, one per shared utility. Nx tags enforce boundaries.
- **Health data stays out of** logs, error reports, analytics and AI prompts.
- **Rules own the numbers**: every number, schedule and safety outcome comes from domain rules. The AI picks pre-filtered exercise IDs and writes meal ideas as ingredient IDs.
- **Copy**: wellness wording only (see the never-advise list in Safety rules). Every string exists in EN and EL.
- **Safety-critical paths need Vang's explicit sign-off note in the PR**: Screening and stop flags, copy, AI prompts and validators, migrations.
- **No GitHub repo yet**: work on local branches and merge to `main` locally until `gh` is set up.
