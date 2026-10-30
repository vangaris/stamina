---
name: stamina-architecture
description: Architecture and file layout for Stamina. Use before implementing, refactoring or reviewing any feature, package, component, composable, util or handler, and when deciding where code lives or which package may import which.
---

# Stamina architecture

Design before code. This skill is the procedure; the rules it applies live in `AGENTS.md` (layering, seams), `docs/development.md` ("Code standards", "Module boundaries") and `eslint.config.mjs` (boundaries, enforced by `pnpm lint`). Vocabulary: `skill://codebase-design` (module, interface, seam, adapter, depth) and `GLOSSARY.md`.

## Steps

### 1. Orient

Read the ticket, the matching part of `.scratch/mvp-build/spec.md`, and the code next to where the change lands.

**Done when:** you can name the user-visible behaviour, the packages it touches, and the existing modules you will reuse.

### 2. Place

Use the map below to put every piece of the change in its home.

**Done when:** each piece has one home, and every import it needs is allowed by the tags.

### 3. Design

For each new module write three lines: its interface (types, invariants, errors), what hides behind it, and where tests cross it. Apply the deletion test; keep a seam only where a real and a fake adapter both exist (`createServices(env)` is the model).

**Done when:** no module is a pass-through, each interface is smaller than its implementation, and the design note is stated before the first edit.

### 4. Lay out

Give each feature, UI component and util the folder shape in `docs/development.md` "Folder shape": `index.ts` as the only public interface, `types.ts`, `config.ts`, `components/`, `composables/`, `utils/`, tests beside their file, no empty folders. Logic leaves the `.vue` file; types are exported from `index.ts`.

**Done when:** every exported function, composable and type has its own file and is reachable only through `index.ts`.

### 5. Verify

`pnpm lint` (boundaries), `pnpm typecheck`, `pnpm test`, plus `pnpm --filter @stamina/web e2e` or `e2e:ui` when behaviour in the browser changed.

**Done when:** all pass and the review checklist in `docs/development.md` has no open item.

## Map

| Home                               | Tags              | May depend on           | Holds                                                                                          |
| ---------------------------------- | ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/web`                         | app, vue          | anything                | routes, containers, one composable per container, stores (state only), `createServices` wiring |
| `apps/api`                         | app, server       | anything                | Hono routes, DB, auth; the server is authoritative for every number                            |
| `packages/domain`                  | domain, shared    | util                    | pure rules: Load, Blocks, progression, Deload, targets, Screening, stop flags                  |
| `packages/app-core`                | app-core, shared  | domain, contracts, util | mediator, commands/queries, pipeline, handlers, service interfaces; no Vue or React            |
| `packages/contracts`               | contracts, shared | util                    | zod schemas, OpenAPI, typed client                                                             |
| `packages/ui/<name>`               | ui, vue           | ui, util                | one presentational component per package; props in, events out                                 |
| `packages/tokens`, `packages/i18n` | util, shared      | util                    | design tokens; EN/EL messages                                                                  |
| `packages/util/<name>`             | util              | util                    | one shared utility per package                                                                 |

## Where does it go?

- A rule that produces a number, schedule or safety outcome: `domain`, tested through the API seam.
- Orchestration (validate, queue offline, call the API, write a store): an `app-core` handler behind `mediator.send()`.
- State a screen reads: a Pinia store that holds state only.
- A container's behaviour: one composable in its feature, calling the mediator.
- Markup with no behaviour of its own: a presentational component in `packages/ui`.
- Pure helper used by two features: a `packages/util/<name>` package; used by one: that feature's `utils/`.
- Any user-visible string: `packages/i18n`, EN and EL together.
- Health data never reaches logs, error reports, analytics or AI prompts.
