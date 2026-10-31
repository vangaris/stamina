# Development

## Local

Node 22+ and pnpm 10 (`corepack enable`). No Docker or Postgres install is needed: local and test databases are an embedded real Postgres.

```bash
pnpm install
pnpm --filter @stamina/api db:dev          # Postgres on :54329 in apps/api/.pgdata, migrated; Ctrl-C stops it
cp apps/api/.env.example apps/api/.env
pnpm --filter @stamina/api dev             # API on :8787
pnpm --filter @stamina/web dev             # web on :5173 (VITE_API_URL defaults to :8787)
```

| Task                                   | Command                                    |
| -------------------------------------- | ------------------------------------------ |
| lint (incl. module boundaries)         | `pnpm lint`                                |
| typecheck, build                       | `pnpm typecheck`, `pnpm build`             |
| seam 1 (API) and seam 2 (app-core)     | `pnpm test`                                |
| seam 3 (Playwright + axe, phone width) | `pnpm --filter @stamina/web e2e`           |
| UI kit only (dev page, no DB or API)   | `pnpm --filter @stamina/web e2e:ui`        |
| only what a branch changed             | `pnpm affected`                            |
| new migration                          | edit `src/db/schema.ts`, `pnpm --filter @stamina/api db:generate` |

- Seam 1 uses `TEST_DATABASE_URL` when set (CI points it at a Postgres service container), otherwise starts an embedded Postgres.
- `pnpm --filter @stamina/web e2e` starts its own Postgres (:54330, data in `apps/api/.pgdata-e2e`, so it never clashes with a `db:dev` that is already running), API (:8788) and built web (:4173). Set `PLAYWRIGHT_BASE_URL` to run it against a deployed preview instead.
- Migrations are forward-only: never edit an applied file, add a new one.
- **Auth and row-level security (API).** Authenticated routes need `Authorization: Bearer <jwt>` (the short-lived Neon Auth token); `authenticate` verifies it with `jose` against the JWKS of `NEON_AUTH_BASE_URL` and sets the pseudonymous `userId`. User-owned tables are touched **only** through `withUser(db, userId, fn)` (`apps/api/src/db/with-user.ts`): one transaction as the NOLOGIN `stamina_app` role with `app.user_id` set, because Neon owner roles and local superusers bypass RLS. Each user-owned table's migration enables and forces RLS, adds a policy on `app_user_id()` and grants its privileges to `stamina_app`. Tests mint tokens with a local Ed25519 JWKS (`apps/api/test/support/test-auth.ts`), so real verification runs without Neon.

## Module boundaries

Tags live in each package's `package.json` (`nx.tags`); the rules are in `eslint.config.mjs` and fail `pnpm lint`.

| Tag               | May depend on                                           |
| ----------------- | ------------------------------------------------------- |
| `type:util`       | `type:util`                                             |
| `type:ui`         | `type:ui`, `type:util`                                  |
| `type:domain`     | `type:domain`, `type:util`                              |
| `type:contracts`  | `type:contracts`, `type:util`                           |
| `type:app-core`   | `type:app-core`, `type:domain`, `type:contracts`, `type:util` |
| `type:app`        | anything                                                |
| `scope:shared`    | `scope:shared` (no Vue, no React)                       |
| `scope:vue`       | `scope:vue`, `scope:shared`                             |
| `scope:react`     | `scope:react`, `scope:shared`                           |
| `scope:server`    | `scope:server`, `scope:shared`                          |

A package gets one `type:` and one `scope:` tag. UI components go in `packages/ui/<name>`, shared utilities in `packages/util/<name>`.

## CI and previews

Workflows are in `.github/workflows/`.

- **`ci.yml`**: `nx affected` lint, typecheck, test, build; the UI kit Playwright job (`e2e:ui`, contrast, tap size, focus, reduced motion, sheet focus trap); Gitleaks (pinned binary, full history); OSV-Scanner on `pnpm-lock.yaml`.
- **`pr-title.yml`**: the PR title must be a Conventional Commit (the squash commit message is the title), e.g. `feat: 02 Release, infrastructure and ops pipeline`.
- **`preview.yml`**: per PR, a Neon branch (migrated) + that branch's own Neon Auth (its origin trusted, its `base_url` read) + a Cloudflare Worker `stamina-api-pr-<N>` (`scripts/workers-deploy.mjs preview`) with that branch's `DATABASE_URL` (secret) and `NEON_AUTH_BASE_URL` (var) + a Cloudflare Pages alias `pr-<N>` whose `/auth/*` proxy points at that branch's Neon Auth, then `e2e` against it. Closing the PR deletes the Worker and the Neon branch (the branch also expires after 14 days). PRs that only touch docs, tickets or templates skip it.
- **`release.yml`**: release-please keeps a release PR open; merging it tags, migrates production, deploys the API, then the web, then smoke-checks. See [releasing.md](releasing.md).
- **Dependabot** (`.github/dependabot.yml`): weekly grouped npm and GitHub Actions updates. Dependabot PRs get no Actions secrets, so `preview.yml` skips them; CI still runs.

Free-minutes levers: concurrency cancels superseded runs, `nx affected` skips untouched projects, pnpm is cached, doc-only PRs skip the preview.

### One-time setup (needs accounts, not in the repo)

Run `./scripts/setup-services.sh`. It signs `gh` in, creates the private repo, creates the Neon project (Frankfurt, plus a data-free `dev` branch) and the Cloudflare Pages project, sets every secret and variable below, and opens the first PR. You paste in two tokens; it creates everything else. Safe to re-run. Values are kept in the gitignored `.env`.

What it sets:

| Where                         | Name                                   | Value                                                                   |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Actions secret                | `NEON_API_KEY`                         | Neon API key                                                            |
| Actions secret                | `CLOUDFLARE_API_TOKEN`                 | token with Pages edit **and Workers Scripts edit** (the API Worker; see [infra.md](infra.md), "Runbook: Cloudflare token and Workers") |
| Actions variable              | `NEON_PROJECT_ID`                      | the Frankfurt project                                                   |
| Actions variable              | `NEON_PARENT_BRANCH`                   | a branch **without real user data** (e.g. `dev`); never production      |
| Actions variables             | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT` | Pages project (direct upload)                              |
| Actions variable              | `NEON_AUTH_BASE_URL`                   | the production branch's Neon Auth `base_url` (`scripts/ops/neon-auth-setup.mjs --branch main` prints it; not set by `setup-services.sh`, see [auth.md](auth.md)) |
| Actions variables             | `PROD_API_URL`, `PROD_WEB_URL`         | production Worker URL (`https://stamina-api.<subdomain>.workers.dev`) and web URL; set by hand, see [releasing.md](releasing.md) and [infra.md](infra.md) |

Each preview Worker gets its own `DATABASE_URL` and `SENTRY_DSN` as Worker secrets and its own `CORS_ORIGINS`, `NEON_AUTH_BASE_URL` and `SENTRY_ENVIRONMENT` as vars, set by `scripts/workers-deploy.mjs`; nothing is configured on the Worker by hand. The `dev` branch (`NEON_PARENT_BRANCH`) must have Neon Auth set up once with `scripts/ops/neon-auth-setup.mjs`, because every preview branch inherits its auth configuration; see [auth.md](auth.md).

## Code standards

The default for every implementation; `/code-review` checks the diff against it. Design first: read `skill://stamina-architecture` (project skill in `.claude/skills/`, built on `skill://codebase-design`), then write down the modules, their interfaces and where tests cross before coding.

### Design

- **Deep modules**: a small interface with a lot of behaviour behind it. The interface is everything a caller must know (types, invariants, ordering, errors), not just the signature.
- **Deletion test**: if deleting a module makes its complexity vanish, it was a pass-through; inline it. If the complexity reappears in every caller, it earns its keep.
- **Seams**: put one where behaviour must vary (real vs fake adapter, e.g. `createServices(env)`), not for hypothetical reuse. One adapter is a hypothetical seam; two is a real one.
- **Testable by shape**: accept dependencies instead of creating them, return results instead of mutating, keep the surface small.

### Folder shape

Every feature, UI component and shared utility (a package, or a folder under `apps/*/src/features/<feature>`) uses the same shape. Create only what is used.

```
packages/ui/stepper/
  src/
    index.ts                 the only public interface: re-exports components, composables, utils, `export type`s
    types.ts                 props, options, events, results (`types/` when it grows)
    config.ts                constants, defaults, tunables
    enums/
      stepper-format.ts      one string enum per file, named after it (kebab-case)
    components/
      Stepper.vue            wiring only: props, emits, template
      Stepper.test.ts
    composables/
      useSpinbutton.ts       Vue state and lifecycle that is not template wiring
      useSpinbutton.test.ts
    utils/
      clamp-to-step.ts       pure functions, one concept per file
      clamp-to-step.test.ts
```

- **Logic is not in the `.vue` file.** An SFC's `<script setup>` calls composables and utils; any exported function or composable is its own file with a test beside it. Pure logic goes in `utils/`, anything touching Vue reactivity or lifecycle in `composables/` (`useXxx`).
- **Types are exported.** Declare props, options, events and results in `types.ts`, import them in the component (`defineProps<StepperProps>()`), and re-export from `index.ts` with `export type { ... }`. Never declare an exported type inline in a component, handler or util.
- **No magic strings: enums.** A closed set of values that code branches on or passes around is a string `enum` in `enums/<kebab-name>.ts` (one per file), re-exported from `index.ts` as a value (`export { ButtonVariant } from './enums/button-variant.ts'`) and used by name everywhere: `status === HealthStatus.Ok`, `kind: HealthStateKind.Degraded`, `case Key.ArrowUp`. Enum values are the existing wire/DOM strings, so JSON, markup and i18n keys do not change. Config maps use computed keys (`{ [ButtonVariant.Primary]: '...' }` typed `Record<ButtonVariant, string>`), zod uses `z.enum(MyEnum)`, iteration uses `Object.values(MyEnum)`. In Vue templates import the enum in `<script setup>` and bind it (`:variant="ButtonVariant.Danger"`); a static `variant="danger"` fails `vue-tsc`, which is the enforcement: comparing an enum to a string literal is a compile error. Not enums: CSS class strings (`config.ts` class maps), static native attributes in templates (`role="tablist"`), DOM event names, i18n message keys, `typeof` checks. Shared keyboard keys and ARIA roles live in `@stamina/a11y` (`Key`, `AriaRole`, `AriaLive`).
- **Constants live in `config.ts`**: defaults, limits, durations, class maps, option lists. No magic values in components or utils.
- **One concept per file**, named after what it exports (`clamp-to-step.ts` exports `clampToStep`; `Stepper.vue` is `Stepper`). No catch-all `helpers.ts` or `utils.ts`.
- **`index.ts` is the seam**: other packages and features import only from it. No deep imports into another module's folders, no cross-feature imports except through `index.ts`.
- **App features** follow the client layering in `AGENTS.md`: `features/<feature>/components` holds the container and presentational components, `composables/` the one composable the container calls, `types.ts` and `config.ts` as above. Shared code moves to a package once a second feature needs it.

### Tests

- Tests sit next to the file they test and cross its interface, not its internals (see `AGENTS.md` "Test seams": domain rules are tested through the API seam, not as isolated units; UI and utility modules get their own interface tests).
- A util or composable extracted for testability must have a test that could fail for a plausible bug; extraction is not a reason to test wiring.

### Review checklist

Module interface small and documented? Any pass-through to delete? Logic out of the SFC and in its own tested file? Types in `types.ts` and re-exported? Any string literal that is really a closed set (use an enum)? Constants in `config.ts`? Anything imported past another module's `index.ts`?

Every package under `packages/` follows this shape. Two exceptions are deliberate: `@stamina/ui-test` (its `config.js` must be plain JS because Vitest loads it through Node) and `@stamina/tokens`'s generated `tokens.css`.

## Design tokens and UI components

**Tokens** (`packages/tokens`) are DTCG JSON in two tiers: `primitive.tokens.json` (raw values; the only file a brand theme replaces) and `semantic.*.tokens.json` (named roles that alias primitives: `bg`, `surface`, `text`, `accent`, `load`, `suggest`, `danger`, `focus`, … plus type, spacing, radius, tap size). `pnpm --filter @stamina/tokens generate` compiles them to `src/tokens.css` (committed; the tokens test fails when it is stale): CSS variables for light and dark (the phone's setting, or `data-theme="light|dark"` on any element) and the Tailwind `@theme` mapping. The default Tailwind palette and scales are removed, so only semantic roles generate utilities: `bg-surface text-text border-border`, `text-sm` (14 px), `p-4` (16 px), `rounded-md`, `min-h-tap` (44 px). Placeholder values: system font, type 12/14/16/20/24/32/48 (`xs sm base lg xl 2xl 3xl`), spacing 4/8/12/16/24/32 (`1 2 3 4 6 8`, plus `0`), radius 8/16/pill (`md lg pill`).

**Components** are one package per component in `packages/ui/<name>` (`@stamina/ui-<name>`), presentational (props in, events out) and framework-light:

- Style with semantic utilities only. `pnpm lint` rejects Tailwind palette classes (`bg-indigo-700`), arbitrary colours and arbitrary px/rem lengths in `packages/ui/**/*.vue`.
- Every user-visible string is a prop or slot (accessible names included); packages never import i18n.
- Interactive elements: native elements first, a visible focus outline (the `focus-ring` utility from the tokens, or `focus-ring-inset` where the edge is clipped), a hit area of at least 44 x 44 px (`min-h-tap min-w-tap`; a small visual control sits inside a 44 px `label` or `data-tap-target` wrapper), and correct ARIA roles/states.
- Motion: use `transition-*` classes (their duration is the `base` token). `tokens.css` collapses all CSS transitions and animations under `prefers-reduced-motion`; code that animates in JS must check `matchMedia('(prefers-reduced-motion: reduce)')`.
- Ids come from `useId()` (every component renders twice on the dev page).
- Tests sit next to the component (`src/*.test.ts`, Vitest + jsdom + `@vue/test-utils`) and call `expectNoA11yViolations` from `@stamina/ui-test`. Colour contrast, tap size, focus indicators and reduced motion need real layout, so the dev page is checked in Chromium by `apps/web/e2e/ui-kit.spec.ts`.

**Dev UI page**: `pnpm --filter @stamina/web dev`, then open `/dev/ui`. It renders every component in a light and a dark container. Add a component by dropping `<Name>Demo.vue` into `apps/web/src/dev/demos/`. The route exists only when `import.meta.env.DEV` is true, so production builds carry neither the route nor the page (`e2e/dev-page.spec.ts` checks it).

## Translations

`packages/i18n` holds the messages: `src/locales/en.json` (the source) and `el.json`, nested, ICU syntax (`{count, plural, one {# set} other {# sets}}`). `pnpm test` fails when an English key has no Greek value, when a Greek message is not valid ICU or uses different arguments, or when Greek has a key English lacks. The web app compiles messages with `intl-messageformat` (`apps/web/src/i18n.ts`) and picks the locale from the phone (`navigator.languages`). Style guide for Greek: informal «εσύ», gym terms with the English name on first use, Greek number format.
