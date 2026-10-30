import { ServicesMode } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { resolveServicesEnv } from './resolve-services-env.ts';

describe('resolveServicesEnv', () => {
  it('points auth at this origin so the session cookie is first-party', () => {
    expect(resolveServicesEnv({ apiUrl: 'https://api.test', origin: 'https://app.test' })).toEqual({
      mode: ServicesMode.Production,
      apiBaseUrl: 'https://api.test',
      authUrl: 'https://app.test/auth',
    });
  });

  it('runs fully in memory in dev mode, without an API URL', () => {
    expect(resolveServicesEnv({ mode: ServicesMode.Dev, origin: 'http://localhost' })).toEqual({
      mode: ServicesMode.Dev,
    });
  });

  it('fails loudly when a real build has no API URL', () => {
    expect(() => resolveServicesEnv({ origin: 'https://app.test' })).toThrow(/VITE_API_URL/);
  });
});
