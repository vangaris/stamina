/** Matches an origin against exact entries or a `https://*.host` wildcard. */
export function isOriginAllowed(origin: string, allowed: readonly string[]): boolean {
  return allowed.some((pattern) => {
    if (pattern === origin) return true;
    const star = pattern.indexOf('*.');
    if (star === -1) return false;
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1); // ".example.pages.dev"
    return (
      origin.startsWith(prefix) &&
      origin.endsWith(suffix) &&
      origin.length > prefix.length + suffix.length &&
      !origin.slice(prefix.length, origin.length - suffix.length).includes('/')
    );
  });
}
