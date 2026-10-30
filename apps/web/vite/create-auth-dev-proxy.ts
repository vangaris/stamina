import type { ProxyOptions } from 'vite';
import { AUTH_PATH } from '../src/config.ts';

/**
 * Dev and preview twin of the production Pages Function: `/auth/<rest>` on the web origin goes to
 * `<target>/<rest>`. `target` already ends in `/auth` (Neon's base URL), so the prefix is dropped
 * before the proxy appends the rest. Cookies pass through untouched. The request carries the web
 * origin as `Origin`, which is what Better Auth checks against its trusted origins.
 */
export function createAuthDevProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.slice(AUTH_PATH.length),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        proxyReq.setHeader('origin', req.headers.origin ?? `http://${req.headers.host}`);
      });
    },
  };
}
