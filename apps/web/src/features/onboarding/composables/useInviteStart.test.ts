import {
  AppError,
  AppErrorCode,
  createAppMediator,
  createServices,
  FAKE_INVITE,
  ServicesMode,
} from '@stamina/app-core';
import { describe, expect, it, vi } from 'vitest';
import { StartMessageKey } from '../enums/start-message-key.ts';
import { StartNotice } from '../enums/start-notice.ts';
import { useInviteStart } from './useInviteStart.ts';

/** The real mediator over the in-memory services: the same seam the app crosses. */
function setup(overrides: Partial<ReturnType<typeof createServices>> = {}, notice?: StartNotice) {
  const services = { ...createServices({ mode: ServicesMode.Test }), ...overrides };
  const mediator = createAppMediator({
    services,
    stores: {
      health: { set: () => undefined },
      session: { set: () => undefined },
      profile: { set: () => undefined },
    },
  });
  const onValid = vi.fn();
  const start = useInviteStart({ onValid, mediator, notice });
  return { start, onValid, services };
}

describe('useInviteStart', () => {
  it('goes on with a valid code, however it was typed, and the code is remembered', async () => {
    const { start, onValid, services } = setup();

    start.setCode(` ${FAKE_INVITE.validCode.toLowerCase()} `);
    await start.submit();

    expect(onValid).toHaveBeenCalledOnce();
    expect(start.errorKey.value).toBeUndefined();
    expect(services.inviteStorage.get()).toBe(FAKE_INVITE.validCode);
  });

  it.each([
    ['an unknown code', 'ABCDEFGHJK'],
    ['a used code', FAKE_INVITE.usedCode],
    ['something that is not a code', 'hello'],
  ])('stays put with a message for %s', async (_name, code) => {
    const { start, onValid } = setup();

    start.setCode(code);
    await start.submit();

    expect(onValid).not.toHaveBeenCalled();
    expect(start.errorKey.value).toBe(StartMessageKey.Invalid);
    expect(start.busy.value).toBe(false);
  });

  it('asks for a code when the field is empty', async () => {
    const { start, onValid } = setup();

    await start.submit();

    expect(onValid).not.toHaveBeenCalled();
    expect(start.errorKey.value).toBe(StartMessageKey.Empty);
  });

  it('clears the message as soon as the code is edited', async () => {
    const { start } = setup();
    start.setCode('hello');
    await start.submit();

    start.setCode('hello2');

    expect(start.errorKey.value).toBeUndefined();
  });

  it('explains being offline', async () => {
    const { start } = setup({ network: { isOnline: () => false } });

    start.setCode(FAKE_INVITE.validCode);
    await start.submit();

    expect(start.errorKey.value).toBe(StartMessageKey.Offline);
  });

  it('shows the generic message for a failure it does not know', async () => {
    const base = createServices({ mode: ServicesMode.Test }).api;
    const { start } = setup({
      api: {
        ...base,
        checkInvite: async () => {
          throw new AppError(AppErrorCode.Unknown);
        },
      },
    });

    start.setCode(FAKE_INVITE.validCode);
    await start.submit();

    expect(start.errorKey.value).toBe(StartMessageKey.Unknown);
  });

  it('ignores a second submit while the first is running', async () => {
    const base = createServices({ mode: ServicesMode.Test }).api;
    let calls = 0;
    const { start } = setup({
      api: { ...base, checkInvite: async (code) => (calls++, base.checkInvite(code)) },
    });
    start.setCode(FAKE_INVITE.validCode);

    await Promise.all([start.submit(), start.submit()]);

    expect(calls).toBe(1);
  });

  it('shows the notice the screen was opened with', () => {
    expect(setup({}, StartNotice.InviteRejected).start.noticeKey.value).toBe(
      StartMessageKey.InviteRejected,
    );
    expect(setup().start.noticeKey.value).toBeUndefined();
  });
});
