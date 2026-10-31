import { serve } from '@hono/node-server';
import { composeApi } from './compose.ts';
import { loadConfig } from './config.ts';
import { createPgDb } from './db/pg-client.ts';
import { sharedDb } from './db/shared-db.ts';

const config = loadConfig(process.env);
const api = composeApi(config, sharedDb(createPgDb(config.databaseUrl)));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: (request) => api.fetch(request), port }, () =>
  console.log(`api listening on :${port}`),
);
