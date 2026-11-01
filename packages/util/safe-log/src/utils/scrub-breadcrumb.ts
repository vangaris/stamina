/** Sentry `beforeBreadcrumb`: breadcrumb messages and data can embed user input, so none are kept. */
export function scrubBreadcrumb(): null {
  return null;
}
