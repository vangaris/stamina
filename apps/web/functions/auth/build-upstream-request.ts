import { AUTH_PREFIX } from './config.ts';
import { ForwardedHeader } from './enums/forwarded-header.ts';

/**
 * Turns `https://app/auth/<rest>?<query>` into the same call on `<authBaseUrl>/<rest>?<query>`,
 * with only the headers Better Auth needs. Returns `undefined` for a path that is not under
 * `/auth/`, so nothing else of the web origin can be reached through the proxy.
 */
export async function buildUpstreamRequest(
  request: Request,
  authBaseUrl: string,
): Promise<Request | undefined> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(AUTH_PREFIX)) return undefined;

  const base = new URL(authBaseUrl.replace(/\/+$/, ''));
  const upstream = new URL(`${base.href}/${url.pathname.slice(AUTH_PREFIX.length)}${url.search}`);
  // `..` segments are already resolved by URL parsing; this guards the base all the same.
  if (upstream.origin !== base.origin || !upstream.pathname.startsWith(`${base.pathname}/`)) {
    return undefined;
  }

  const headers = new Headers();
  for (const name of Object.values(ForwardedHeader)) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(upstream, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : null,
    // A social sign-in answers with a redirect the browser must follow itself.
    redirect: 'manual',
  });
}
