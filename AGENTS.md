# Stamina

AI coach that plans training, food and recovery around the sport a user plays. Greenfield MVP build, driven by tickets.

## Where the truth lives

- **Vocabulary**: `GLOSSARY.md`. Use its terms in code, tickets and copy.
- **Build spec**: `.scratch/mvp-build/spec.md`. Read before any implementation ticket.
- **Build tickets**: `.scratch/mvp-build/issues/NN-*.md`.
- **Why a decision was made**: the closed decision tickets in `.scratch/mvp-plan/issues/`, linked from `docs/mvp-plan.md`. Read the matching ticket before changing a decided behaviour.
- **Tracker conventions**: `docs/agents/issue-tracker.md`.

## Each implementation session

1. **Read the board.** Run `scripts/tickets.sh`; it prints every ticket's status, ticked boxes and blockers. Resume a ticket marked IN PROGRESS first; otherwise use the one the user named, else the one marked NEXT.
2. **Claim it.** Set `**Status:** in-progress` in the ticket file and commit, before writing code.
3. **Branch.** Create `feat/NN-slug` from `main`.
4. **Design first.** Before any implementation (a ticket, a fix, a refactor), read `skill://stamina-architecture` (it applies `skill://codebase-design`) and decide the modules, their interfaces and the seams, then lay files out per **Code standards** below. For a `packages/ui` component also read `skill://stamina-ui-component`. State the design in a few lines (modules, interface, where tests cross) before writing code.
5. **Implement** with `/implement`, test-first at the agreed seams. Tick each acceptance box (`- [x]`) in the ticket file as soon as its criterion passes, and commit, so an interrupted session can resume where it left off.
6. **Finish.** The ticket is done when every box is ticked, the full test suite and typecheck are green, and `/code-review` has run.
7. **Close it.** Set `**Status:** done`. Squash-merge to `main` with a Conventional title: `feat: NN <ticket title>`.
8. **Report** by running `scripts/tickets.sh` again and naming the new NEXT ticket.

## Code standards (default for every implementation)

Full layout, examples and the review checklist: `docs/development.md`, "Code standards".

- **Deep modules.** Small interface, a lot of behaviour behind it, tested through that interface. Apply the deletion test; add a seam only where two adapters really exist (real + fake). Use the skill's words: module, interface, seam, adapter.
- **One folder shape per feature, UI component or shared utility**: `components/`, `composables/`, `utils/`, `enums/`, `types.ts` (or `types/`), `config.ts`, and `index.ts` as the only public interface. Create what is used, no empty folders.
- **No magic strings.** A closed set of values that code branches on or passes around (variants, tones, modes, kinds, statuses, keys, ARIA roles set in script, request types, env names, error codes, route and tab ids, locale codes) is a string `enum` in the owning feature's `enums/<kebab-name>.ts`, one per file, exported from `index.ts` as a value and used by name everywhere (`HealthStateKind.Ok`, never `'ok'`). The enum value is the wire/DOM string, so nothing outside the code changes.
- **Logic leaves the `.vue` file.** Every exported function, composable and utility is its own file with a test next to it. An SFC only wires props, emits and template to them.
- **Types are exported.** Props, options, events and results are declared in `types.ts` and re-exported from `index.ts` with `export type`; never declared inline in a component or a handler.
- **Constants and defaults live in `config.ts`.** No magic numbers, strings or tunables in components or utilities.
- **Readable and scalable.** One concept per file, named after what it exports; accept dependencies instead of creating them; return results instead of mutating; no cross-feature imports except through `index.ts`.

## Rules that are easy to break

- **Test seams**: API over HTTP (real Hono app + Postgres, fake AI provider), the `app-core` mediator with mock services, and a few Playwright journeys. Test domain rules through the API seam, never as isolated units.
- **Client layering**: container → one composable → `mediator.send()` → pipeline → handler → services from `createServices(env)`. Stores hold state only. `app-core` and `domain` stay free of Vue and React.
- **Packages**: one per UI component, one per shared utility. Nx tags enforce boundaries.
- **Health data stays out of** logs, error reports, analytics and AI prompts.
- **Rules own the numbers**: every number, schedule and safety outcome comes from domain rules. The AI picks pre-filtered exercise IDs and writes meal ideas as ingredient IDs.
- **Copy**: wellness wording only (see the never-advise list in Safety rules). Every string exists in EN and EL.
- **Safety-critical paths need Vang's explicit sign-off note in the PR**: Screening and stop flags, copy, AI prompts and validators, migrations.
- **Phase A (owner-only): nothing may need a payment method.** Free tiers without a card only; the AI runs as the "unavailable" provider (rules and templates). If something needs a card, stop and record it as a Phase B item (see the spec, "Phases").
- **GitHub**: the repo is `vangaris/stamina`. Work on a `feat/NN-slug` branch, open a PR (squash-merge only; the title is a Conventional Commit), and merge it there once CI is green.
