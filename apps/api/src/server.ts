import { unavailableAiProvider } from './ai/provider.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createDb } from './db/client.ts';

const config = loadConfig(process.env);
const { db } = createDb(config.databaseUrl);

const app = createApp({ db, ai: unavailableAiProvider, corsOrigins: config.corsOrigins });

/** Deno Deploy (`deno serve`) and the Node dev entry both consume this. */
export default { fetch: app.fetch };
