import { AUTH_PATH } from '../../src/config.ts';

/** Only this prefix is proxied; `/auth` alone and every other path are not Neon Auth's. */
export const AUTH_PREFIX = `${AUTH_PATH}/`;

export const NO_STORE = 'no-store';
