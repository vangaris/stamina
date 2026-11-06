import { describe, expect, it } from 'vitest';
import { RestMessageKey } from '../enums/rest-message-key.ts';
import { toRestAnnouncement } from './to-rest-announcement.ts';

describe('toRestAnnouncement', () => {
  it('says the seconds left while there are some', () => {
    expect(toRestAnnouncement(30)).toEqual({
      key: RestMessageKey.Announce,
      params: { seconds: 30 },
    });
  });

  it('says the rest is over at zero', () => {
    expect(toRestAnnouncement(0).key).toBe(RestMessageKey.Over);
  });
});
