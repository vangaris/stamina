import { createAuthProxy } from './create-auth-proxy.ts';
// Written at deploy time from NEON_AUTH_BASE_URL by scripts/ops/write-auth-proxy-config.mjs.
import target from './auth-target.generated.json';

const proxy = createAuthProxy({ authBaseUrl: target.authBaseUrl });

/** Cloudflare Pages Function for `/auth/*`. */
export const onRequest = ({ request }: { request: Request }) => proxy(request);
