/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** `dev`: fully in-memory services (fake auth accepting code 424242, fake API), no Neon. */
  readonly VITE_SERVICES_MODE?: string;
  /** Sentry EU DSN. Unset: the build contains no error tracking. */
  readonly VITE_SENTRY_DSN?: string;
  /** `production` or `preview`; defaults to the Vite mode. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}
