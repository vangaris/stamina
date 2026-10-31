export enum ServicesMode {
  /** In-memory mocks, silent: the seam the mediator tests cross. */
  Test = 'test',
  /** In-memory mocks with a console logger: UI work without Neon or an API. */
  Dev = 'dev',
  /** Real API client and Neon Auth. */
  Production = 'production',
}
