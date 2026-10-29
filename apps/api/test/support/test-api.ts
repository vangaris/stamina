import { serve } from '@hono/node-server';
import type { AddressInfo } from 'node:net';
import { inject } from 'vitest';
import { createApp } from '../../src/app.ts';
import { createDb } from '../../src/db/client.ts';
import { createFakeAi } from './fake-ai.ts';

export interface TestApiOptions {
  databaseUrl?: string;
  corsOrigins?: string[];
}

/** Boots the real Hono app on a real port, backed by real Postgres and a fake AI provider. */
export async function startTestApi(options: TestApiOptions = {}) {
  const dbHandle = createDb(options.databaseUrl ?? inject('databaseUrl'));
  const ai = createFakeAi();
  const app = createApp({
    db: dbHandle.db,
    ai: ai.provider,
    corsOrigins: options.corsOrigins ?? [],
  });

  const server = await new Promise<ReturnType<typeof serve>>((resolve) => {
    const s = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    ai,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await dbHandle.close();
    },
  };
}
