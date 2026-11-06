import { describe, expect, it } from 'vitest';
import { SessionStatus } from '../enums/session-status.ts';
import type { Services } from '../types.ts';
import { claimSignedInState } from './claim-signed-in-state.ts';

const USER_ID = 'user-1';

function setup(me: Services['api']['me'] = async () => ({ userId: USER_ID })) {
  const claimed: string[] = [];
  const services = {
    api: { me } as Services['api'],
    localData: {
      clear: async () => undefined,
      claim: async (userId: string) => void claimed.push(userId),
    },
  };
  return { services, claimed };
}

describe('claimSignedInState', () => {
  it('claims the local data for the API user and resolves the signed-in state', async () => {
    const { services, claimed } = setup();

    expect(await claimSignedInState(services)).toEqual({
      status: SessionStatus.SignedIn,
      userId: USER_ID,
    });
    expect(claimed).toEqual([USER_ID]);
  });

  it('claims nothing when the API call fails', async () => {
    const { services, claimed } = setup(async () => {
      throw new Error('unreachable');
    });

    await expect(claimSignedInState(services)).rejects.toThrow('unreachable');
    expect(claimed).toEqual([]);
  });
});
