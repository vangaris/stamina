// Plain JS on purpose: Vitest loads `vitest.config.ts` through Node, which cannot import a
// workspace package's TypeScript source.
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

/** Shared Vitest config for UI packages: Vue SFCs in jsdom, tests next to the component. */
export const uiVitestConfig = defineConfig({
  plugins: [vue()],
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
