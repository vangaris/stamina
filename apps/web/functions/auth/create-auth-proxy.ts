import { buildUpstreamRequest } from './build-upstream-request.ts';
import { NO_STORE } from './config.ts';
import type { AuthProxy, AuthProxyOptions } from './types.ts';

/**
 * Same-origin proxy to Neon Auth: the browser only ever talks to the web origin, so the session
 * cookie Neon sets is first-party (Safari and iOS drop third-party cookies). Responses, including
 * `set-cookie`, pass back untouched except that they are never cached.
 */
export function createAuthProxy({
  authBaseUrl,
  fetch: doFetch = fetch,
}: AuthProxyOptions): AuthProxy {
  return async (request) => {
    const upstream = await buildUpstreamRequest(request, authBaseUrl);
    if (!upstream) return new Response('Not found', { status: 404 });

    let response: Response;
    try {
      response = await doFetch(upstream);
    } catch {
      return new Response('Auth service unreachable', { status: 502 });
    }

    const headers = new Headers(response.headers);
    headers.set('cache-control', NO_STORE);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
