# Observability

Logs and error reports exist to find bugs, never to describe a person. Health data (injuries, conditions, medication, weight, heart rate, free text a user typed) must not reach either. Both are built as allowlists: a field is absent until someone adds it on purpose.

## API request log

`apps/api/src/request-log.ts` is the first middleware of `createApp`, so every request (including 404s, CORS preflights and 500s) writes exactly one JSON line to stdout. On Cloudflare Workers they appear in the Worker's **Logs** (dashboard > Workers & Pages > `stamina-api` > Logs, or `wrangler tail` from `apps/api`).

| Field        | Meaning                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `request_id` | The caller's `x-request-id` if it is a UUID, otherwise a new one. Echoed as the `x-request-id` response header. |
| `route`      | The matched route pattern (`/meals/:id`), never the URL. `unmatched` when no route matched (404).   |
| `status`     | HTTP status.                                                                                         |
| `latency_ms` | Time spent in the app.                                                                               |
| `user_id`    | Pseudonymous ID, only when a handler sets `c.set('userId', …)`. Never an email or name.              |
| `error_type` | Class name of the error a handler threw (`TypeError`). Never the message or stack: messages can embed user input. |

Never logged: request or response bodies, headers, cookies, query strings, path parameter values, IP addresses. The middleware does not read any of them. Do not add `console.log` calls that print request data; `apps/api/test/request-log.test.ts` sends sentinel health strings in every place a request can carry data and fails if one reaches a log line or the console.

The sink is `AppDeps.log` (default `console.log`); tests inject their own.

## Error reports (Sentry, EU region)

Sentry is optional: with no DSN configured nothing is initialised and nothing is sent.

| Where | Name                                 | Notes                                                              |
| ----- | ------------------------------------ | ------------------------------------------------------------------ |
| API   | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`   | `production` (default) or `preview`. Set as a Worker var by `scripts/workers-deploy.mjs`. |
| Web   | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` | Build-time. Without `VITE_SENTRY_DSN` the build contains no Sentry code at all. |

Deploy workflows copy the repository variables `SENTRY_DSN_API` to `SENTRY_DSN` and `SENTRY_DSN_WEB` to `VITE_SENTRY_DSN`. DSNs are public identifiers, so they are variables, not secrets. Only DSNs on `*.de.sentry.io` (the EU region) are accepted; the API refuses to start with any other host and the web app stays off.

What leaves the process, via `@stamina/safe-log`:

- Exception **type** and **stack frames** (function, file, line, column; URL query strings and fragments removed from file names).
- Exception **message is blanked**. Messages can embed what the user sent.
- `request_id` tag (API), `environment`, `level`, timestamp, SDK name.
- Everything else is dropped: request data, headers, cookies, query strings, user, extra data, contexts, breadcrumbs, source lines, local variables, component props. SDK data collection is switched off as well (`noDataCollection`), so those are not even gathered. Transactions and messages are discarded; there is no tracing, no session replay and no client reports.

API only: unexpected errors (5xx) are reported; `HTTPException`s below 500 are not. The API uses `@sentry/core` with a `fetch` transport instead of `@sentry/node`, because the Node SDK relies on OpenTelemetry module patching that neither an esbuild bundle nor Deno Deploy or Cloudflare Workers supports. Tests capture the outgoing envelope with a fake transport (`apps/api/test/error-reporting.test.ts`); the web journey is `apps/web/e2e/sentry.spec.ts`, which builds the web app with a fake DSN, intercepts the envelope and checks it.

To see events: Sentry (EU, `de.sentry.io`) → project → **Issues**. A report shows the exception type and stack but no message by design; find the request in the Worker logs through the `request_id` tag.

Stack frames refer to the bundled files; without uploaded source maps lines point into the bundle.

## Adding a field

Adding a log field or an error-report field is a privacy decision. Extend the allowlist (`RequestLogRecord`, or `EVENT_FIELDS` / `TAG_FIELDS` / `FRAME_FIELDS` in `packages/util/safe-log/src/scrub.ts`), the table above and the sentinel tests in the same change, and call it out in the PR description.
