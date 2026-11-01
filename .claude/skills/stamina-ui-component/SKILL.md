---
name: stamina-ui-component
description: Building or changing a UI kit component in packages/ui. Use when adding a component, its tests, its dev-page demo, or touching tokens or Tailwind classes in packages/ui.
---

# Stamina UI component

Start with `skill://stamina-architecture` for the design and folder shape. Rules: `docs/development.md` "Design tokens and UI components". This skill is the build sequence and the gotchas that cost time.

## Steps

### 1. Design the interface

Decide props, `v-model`, events, slots and the ARIA pattern (APG name). Every string is a prop or slot; no i18n import. Presentational only: props in, events out.

**Done when:** the interface fits in a short type block in `types.ts` and an assistive-tech user's keyboard path is written down.

### 2. Scaffold the package

`packages/ui/<name>` with `@stamina/ui-<name>`, tags `type:ui` + `scope:vue`, `vitest.config.ts` re-exporting `uiVitestConfig` from `@stamina/ui-test/config`, `index.ts` as the only entry. Add the dependency to `apps/web/package.json`, then `pnpm install --no-frozen-lockfile`.

**Done when:** `pnpm --filter @stamina/ui-<name> test` runs.

### 3. Build

Semantic utilities only (`bg-surface text-text border-border`, role pairs `bg-X` with `text-on-X`). Use `focus-ring` (or `focus-ring-inset`), `min-h-tap min-w-tap`, `transition-*`, `useId()`. Roles flip with the theme, so one class set serves light and dark.

**Done when:** `pnpm --filter @stamina/ui-<name> lint typecheck` pass.

### 4. Test at the interface

Next to the file: keyboard operation, emitted events and v-model, ARIA roles/states/names, disabled and edge values, and `expectNoA11yViolations` per state. Add a Playwright spec only for what jsdom cannot prove (focus trap, layout, scroll lock).

**Done when:** each test can fail for a plausible bug, and none asserts class names or internals.

### 5. Show it

`apps/web/src/dev/demos/<Name>Demo.vue` with realistic Stamina content, local state, no fixed ids, nothing modal open by default.

**Done when:** `pnpm --filter @stamina/web e2e:ui` is green in both themes (contrast, 44 px, focus, reduced motion).

## Gotchas

- The Tailwind theme is reset: `p-5`, `w-72`, `bg-gray-100`, `shadow-md` generate nothing. Spacing is `0 1 2 3 4 6 8 tap`; text is `xs sm base lg xl 2xl 3xl` (`text-xl` is 24 px).
- `exactOptionalPropertyTypes` is on: optional props need an explicit `undefined` default.
- A themed overlay must render in place: the dev page scopes `data-theme` to a container, so Teleport to `body` loses the theme (native `<dialog>` keeps inheritance).
- Playwright: `env -u CI` when a dev server is already running (`CI` disables server reuse); `pnpm --filter @stamina/web e2e:ui` needs no database or API.
- Vitest loads `vitest.config.ts` through Node: shared config must be plain JS.
- After editing a token file: `pnpm --filter @stamina/tokens generate`, then commit `tokens.css`.
