import { serve } from '@hono/node-server';
import server from './server.ts';

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: server.fetch, port }, () => console.log(`api listening on :${port}`));
