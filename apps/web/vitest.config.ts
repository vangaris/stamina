import { defineConfig } from 'vitest/config';

// Unit tests beside their code (src, functions); the browser journeys in e2e/ are Playwright's.
export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'functions/**/*.test.ts'] },
});
