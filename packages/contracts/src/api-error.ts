/** Thrown by the typed client for any non-2xx answer (except `/health`, whose 503 carries a body). */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}
