import type { InviteStorage } from '../types.ts';

/** Lost on reload: Test and Dev modes. */
export function createMemoryInviteStorage(): InviteStorage {
  let code: string | undefined;
  return {
    get: () => code,
    save: (value) => {
      code = value;
    },
    clear: () => {
      code = undefined;
    },
  };
}
