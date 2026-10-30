# Auth

Sign-in is **Neon Auth** (managed Better Auth, in the same Neon database as the app data): an emailed one-time code, or Google. No password exists anywhere in the repository, the web app or the API. Ticket: [04 Sign-in through app-core](../.scratch/mvp-build/issues/04-sign-in-app-core.md).

## Design

```
browser ──/auth/*──> web origin (Pages Function, or Vite proxy locally) ──> <NEON_AUTH_BASE_URL>/*   session cookie
browser ──GET /auth/token (cookie)──────────────────────────────────────> short-lived JWT
browser ──Authorization: Bearer <jwt>──> API (Deno Deploy) ──jose + JWKS──> userId ──withUser()──> Postgres (RLS)
```

| Part                       | Decision and why                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transport                  | The browser only talks to Neon Auth through a **same-origin proxy at `/auth/*`** on the web origin (`apps/web/functions/auth/`, a Cloudflare Pages Function; `server.proxy` / `preview.proxy` in Vite locally). Neon Auth uses HTTP-only cookies, and web (Pages), API (Deno) and Neon Auth are three sites, so a direct cookie would be third-party, which Safari and iOS block. Through the proxy the session cookie is first-party to the web origin. The proxy forwards `/auth/<rest>` to `<NEON_AUTH_BASE_URL>/<rest>` and keeps the browser's `Origin`, which Better Auth checks against its trusted domains. |
| Target of the proxy        | `NEON_AUTH_BASE_URL` (Neon's `base_url`, ends with `/auth`). It is written at deploy time by `scripts/ops/write-auth-proxy-config.mjs` into a gitignored file the Function imports, so a deploy of the web is what points it at a branch.                                                          |
| Token flow                 | Sign-in sets the session cookie. The client then calls `GET /auth/token` (cookie authenticated) for a **15 minute EdDSA (Ed25519) JWT** from Better Auth's JWT plugin and sends it as `Authorization: Bearer`. The API never sees a cookie.                                                       |
| API verification           | `createTokenVerifier({ keys, issuer })` (jose) checks signature, `exp` and issuer against the JWKS at `<NEON_AUTH_BASE_URL>/.well-known/jwks.json`. The issuer is the **origin** of `NEON_AUTH_BASE_URL`. `sub` is the user id (uuid). Missing, invalid or expired tokens answer `401 { error: "unauthorized" }`. |
| User row                   | The first `GET /me` creates the `app_user` row for the token's `sub` (idempotent). The client calls it right after verifying the code.                                                                                                                                                           |
| Row-level security         | User-owned tables have RLS forced on. Neon's owner role and local superusers bypass RLS, so user-owned queries never run as the connection user: `withUser(db, userId, fn)` opens a transaction, runs `set local role stamina_app` (a `NOLOGIN`, no-`BYPASSRLS` role created by migration `0001_app_user.sql`) and `set_config('app.user_id', <uuid>, true)`, and the policies compare the row owner with `app_user_id()`. Both settings end with the transaction, so a pooled connection never carries one user into the next request. Each user-owned table's migration must grant its privileges to `stamina_app`. |
| Per-branch auth in previews | Neon copies a branch's auth (users, config, OAuth providers, JWKS keys) with its data, then the two are independent, each with its own `base_url`; tokens and sessions do not cross branches. So every PR's Neon branch has its own Neon Auth. `preview.yml` runs `neon-auth-setup.mjs --preview` on it (trust the preview's web origin, read `base_url`), gives that `base_url` to the preview API revision as `NEON_AUTH_BASE_URL` and to the preview's `/auth` proxy. Previews therefore inherit everything configured on `NEON_PARENT_BRANCH` (`dev`): email, SMTP and the Google client. |
| Google on previews         | Google does not allow wildcard redirect URIs and each preview branch has its own `<base_url>/callback/google`, so **Google sign-in works on `dev` and production only**. The preview Playwright run covers the email code.                                                                          |
| Sign-up gating             | Not part of this ticket: Neon Auth lets anyone sign up for now (invite-only beta comes later).                                                                                                                                                                                                      |

### What the fakes cover

Neon cannot be reached from tests, so every external edge has a fake adapter, and real code runs on both sides of it.

| Seam                                         | Real side that runs                                                                                          | Fake                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `AuthService` (app-core)                     | mediator, pipeline, handlers, error mapping; the Better Auth HTTP adapter (`createBetterAuthService`) against a stub `fetch` | `createServices({ mode: Test })` and `Dev` (in-memory; `Dev` accepts the code `424242`, for UI work without Neon) |
| JWKS key source of the token verifier (API)  | jose verification of signature, algorithm, issuer and expiry; RLS on a real embedded Postgres                | a local JWKS made from a generated Ed25519 key (production passes `createRemoteJWKSet`)               |
| Better Auth HTTP server (Playwright)         | the built web app, the proxy path, the API                                                                    | `apps/web/e2e/support/fake-better-auth.ts` (email code, Google, `/token`, JWKS)                        |
| Neon management API (ops scripts)            | `scripts/ops/neon-auth-setup.mjs`, `scripts/deno-deploy.mjs` run as processes                                 | mock HTTP server in `infra/test/ops-scripts.test.mjs`                                                 |

## Runbook: what only you can do

Run these once, in order. The scripts print what to do next; `--dry-run` shows every request with secrets redacted and needs no keys.

1. **Brevo SMTP key.** `scripts/ops/brevo-setup.sh` (ticket 02) already verifies your sender and prints the SMTP login. In Brevo > SMTP & API > SMTP, **Generate a new SMTP key** (it is not the API key). Put in `.env`: `BREVO_SMTP_LOGIN` (the login shown there) and `BREVO_SMTP_KEY`. `SENDER_EMAIL` is already there. Until a domain exists the sender is a single verified address, so codes may land in spam ([infra.md](infra.md), "Gaps until a domain exists").
2. **Google OAuth client.** Google Cloud Console > APIs & Services: configure the **OAuth consent screen** (External, app name and support email, scopes `openid`, `email`, `profile`), then Credentials > Create credentials > **OAuth client ID**, type **Web application**. Put the client id and secret in `.env` as `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`. Leave the redirect URI for step 3, because it contains Neon's per-branch URL. Without a client, Neon's shared Google credentials stay in place, which are for development only and show Neon's name to users.
3. **Set up the `dev` branch, then production.** Each prints `NEON_AUTH_BASE_URL` and the **Google redirect URI** (`<base_url>/callback/google`); paste each into the OAuth client's **Authorized redirect URIs**, and add the web origins and the Neon Auth origin (scheme and host of `base_url`) under **Authorized JavaScript origins**.

   ```bash
   node scripts/ops/neon-auth-setup.mjs --dry-run                        # review
   node scripts/ops/neon-auth-setup.mjs                                  # dev: localhost allowed, previews inherit it
   node scripts/ops/neon-auth-setup.mjs --branch main --web-origin https://stamina-web.pages.dev
   ```

   Re-running is safe. With no `--web-origin`, `WEB_ORIGINS`, `PROD_WEB_URL` or `CLOUDFLARE_PAGES_PROJECT` in `.env` supply it. For local work put the `dev` URL in `apps/api/.env` as `NEON_AUTH_BASE_URL` and in `apps/web/.env.local` as `AUTH_PROXY_TARGET`.
4. **Actions variable.** `gh variable set NEON_AUTH_BASE_URL --body '<the main branch base_url>'`. The release workflow refuses to deploy without it ([releasing.md](releasing.md)).
5. **Production checklist in the Neon console** (project > production branch `main` > Auth > Configuration; [Neon's checklist](https://neon.com/docs/auth/production-checklist)):
   - **Allow Localhost** is off. The script sets this (on only for `dev`); look at it once.
   - **Enable email verification** ("Verify at Sign-up", method "Verification code"). It is off by default, and anyone can sign up without it. The setup script leaves it to you because it changes who can sign in; the settings are `require_email_verification` and `send_verification_email_on_sign_up` on `PATCH .../auth/email_and_password` if you prefer the API.
   - Optional: the application name shown in the emails (Project Info).
6. **Send a test email** to confirm Brevo accepts the SMTP key before trying to sign in (Neon uses the saved settings, so no secret is sent):

   ```bash
   curl -sS -X POST "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/<branch id>/auth/email_provider/test" \
     -H "Authorization: Bearer $NEON_API_KEY" -H 'content-type: application/json' \
     -d '{"recipient_email":"you@example.com"}'
   ```

Previews need nothing per PR: `preview.yml` does the per-branch work, provided step 3 was run for `dev` (`NEON_PARENT_BRANCH`).

## Not yet verified live

Nothing here could be run against Neon, Brevo or Google when this was written. The code and the scripts follow the vendors' documentation; the first real sign-in is the test.

- **Better Auth REST paths and bodies** used by the app: `POST /email-otp/send-verification-otp`, `POST /sign-in/email-otp`, `GET /token`, `GET /get-session`, `POST /sign-in/social`, `POST /sign-out`, and the error codes `INVALID_OTP`, `OTP_EXPIRED`, `TOO_MANY_ATTEMPTS`. They are all in one adapter module (`packages/app-core/src/services/create-better-auth-service.ts`, endpoint enum beside it). Neon's own SDK wraps Better Auth with extras (an OAuth session "verifier", JWT extraction), so a plain REST call may differ.
- **Google round trip through the proxy.** Google returns to `<base_url>/callback/google` on Neon's own domain, not through our proxy, so the session cookie that call sets is on Neon's domain. Whether the web origin ends up signed in after the redirect back (Neon's SDK uses a session verifier for this) is unconfirmed. Email codes do not have this problem: every call goes through the proxy.
- **`GET /token`** being served through the proxy with the cookie, returning `{ token }` with an EdDSA token whose issuer is the origin of `base_url`.
- **The proxy** (`Origin` kept, `set-cookie` passed through, cookie not dropped by Cloudflare) and that Neon accepts the web origin as a trusted domain for requests that arrive through it.
- **Neon management API details** (listed in the header of `scripts/ops/neon-auth-setup.mjs`): the response when Auth is already enabled, `GET .../auth` for a branch without Auth, that `PATCH .../oauth_providers/google` turns the shared Google credentials into ours, branch search by name, and `type: "standard"` in the email provider body (taken from Neon's production checklist, absent from the API reference).
- **That a preview branch inherits Auth** (Neon's documentation says it does); `neon-auth-setup.mjs --preview` enables Auth with defaults and warns if it did not.
- **Brevo** accepting the SMTP key and delivering the code from the single verified sender without domain authentication.
- **Email OTP** needing no switch beyond "Sign-up and Sign-in with Email" (the Neon guide lists only that; the API has no email-OTP endpoint).
