import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Unit tests beside their code (src, functions); the browser journeys in e2e/ are Playwright's.
// The Vue plugin lets a test import a feature through its `index.ts`, which re-exports components.
export default defineConfig({
  plugins: [vue()],
  test: { include: ['src/**/*.test.ts', 'functions/**/*.test.ts'] },
});
