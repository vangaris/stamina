export interface ServicesEnvInput {
  /** `VITE_SERVICES_MODE`; only `dev` changes anything. */
  mode?: string | undefined;
  /** `VITE_API_URL`, or the dev default. */
  apiUrl?: string | undefined;
  /** The origin the app is served from (`location.origin`). */
  origin: string;
}
