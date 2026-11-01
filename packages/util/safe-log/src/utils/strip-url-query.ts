/** Drops the query string and fragment, which can carry user input, from a URL or path. */
export function stripUrlQuery(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}
