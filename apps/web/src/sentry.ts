import * as Sentry from '@sentry/vue';
import { isEuSentryDsn, noDataCollection, scrubBreadcrumb, scrubEvent } from '@stamina/safe-log';
import type { App } from 'vue';

/**
 * Error tracking for the browser. Loaded only when the build has a DSN (see `main.ts`).
 * Only unhandled errors are captured: no tracing, session replay, breadcrumbs, user info,
 * request data or component props. Events are further reduced by `@stamina/safe-log`.
 */
export function initSentry(app: App, { dsn, environment }: { dsn: string; environment: string }) {
  if (!isEuSentryDsn(dsn)) {
    console.error('Error tracking is off: VITE_SENTRY_DSN must be an https DSN on *.de.sentry.io');
    return;
  }
  Sentry.init({
    app,
    dsn,
    environment,
    attachProps: false,
    dataCollection: noDataCollection,
    sendClientReports: false,
    // An allowlist: anything Sentry adds to its defaults later stays off until added here.
    defaultIntegrations: [
      Sentry.functionToStringIntegration(),
      Sentry.browserApiErrorsIntegration(),
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.vueIntegration({ app, attachProps: false }),
    ],
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}
