/** Ports and URLs of the local e2e stack (started by `playwright.config.ts`). */
export const E2E_DB_PORT = 54330;
export const E2E_DATABASE_URL = `postgres://stamina:stamina@127.0.0.1:${E2E_DB_PORT}/stamina`;
export const E2E_API_PORT = 8788;
export const E2E_API_URL = `http://127.0.0.1:${E2E_API_PORT}`;
