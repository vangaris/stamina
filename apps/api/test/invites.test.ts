import { inviteCheckResponseSchema } from '@stamina/contracts';
import { INVITE_CODE_INPUT_MAX_LENGTH } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { appUser, invite } from '../src/db/schema.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { generateInviteCode } from '../src/invites/generate-invite-code.ts';
import { issueInvite } from './support/profile-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const run = promisify(execFile);
const API_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('POST /invites/check', () => {
  let api: Awaited<ReturnType<typeof startTestApi>>;
  const lines: string[] = [];
  beforeAll(async () => {
    api = await startTestApi({ log: (line) => lines.push(line) });
  });
  afterAll(() => api.close());

  const check = (body: unknown) =>
    fetch(`${api.baseUrl}/invites/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const validOf = async (code: string) =>
    inviteCheckResponseSchema.parse(await (await check({ code })).json()).valid;

  it('says valid for an unused code, without any token', async () => {
    const code = await issueInvite(api.db);

    const response = await check({ code });

    expect(response.status).toBe(200);
    expect(inviteCheckResponseSchema.parse(await response.json())).toEqual({ valid: true });
  });

  it('accepts the code as typed: lower case, spaces and hyphens', async () => {
    const code = await issueInvite(api.db);
    const typed = `${code.slice(0, 5)}-${code.slice(5)}`.toLowerCase();

    expect(await validOf(` ${typed} `)).toBe(true);
  });

  it('says invalid for unknown, malformed and used codes, all the same way', async () => {
    const used = await issueInvite(api.db);
    const redeemer = crypto.randomUUID();
    await api.db.insert(appUser).values({ id: redeemer });
    await api.db
      .update(invite)
      .set({ redeemedBy: redeemer, redeemedAt: new Date() })
      .where(eq(invite.code, used));

    expect(await validOf(used)).toBe(false);
    expect(await validOf(generateInviteCode())).toBe(false);
    expect(await validOf('short')).toBe(false);
    expect(await validOf("'; drop table invite; --")).toBe(false);
    expect(await validOf('0OIL0OIL0O')).toBe(false);
  });

  it('answers 400 to a body that is not { code: string } within the length bound, without echoing it', async () => {
    const padded = `${generateInviteCode()}${' '.repeat(INVITE_CODE_INPUT_MAX_LENGTH)}`;
    for (const body of [{}, { code: 12 }, { code: '' }, { code: padded }]) {
      const response = await check(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
    }
    const notJson = await fetch(`${api.baseUrl}/invites/check`, { method: 'POST', body: '{' });
    expect(notJson.status).toBe(400);
  });

  it('logs the route and status, never the code', async () => {
    const code = await issueInvite(api.db);
    lines.length = 0;

    await check({ code });

    expect(JSON.parse(lines[0]!)).toMatchObject({ route: '/invites/check', status: 200 });
    expect(lines[0]).not.toContain(code);
  });

  describe('the invites:create script', () => {
    it('prints exactly the new codes on stdout, one per line, and they are usable', async () => {
      const { stdout } = await run('pnpm', ['--silent', 'invites:create', '3'], {
        cwd: API_DIR,
        env: { ...process.env, DATABASE_URL: inject('databaseUrl') },
      });

      const codes = stdout.split('\n').filter(Boolean);
      expect(stdout.endsWith('\n')).toBe(true);
      expect(codes).toHaveLength(3);
      expect(new Set(codes).size).toBe(3);
      for (const code of codes) expect(await validOf(code)).toBe(true);
    });

    it('fails with a message on stderr and no stdout for a bad count', async () => {
      const error = await run('pnpm', ['--silent', 'invites:create', '0'], {
        cwd: API_DIR,
        env: { ...process.env, DATABASE_URL: inject('databaseUrl') },
      }).catch((caught: unknown) => caught as { code: number; stdout: string; stderr: string });

      expect(error).toMatchObject({ code: 1, stdout: '' });
      expect((error as { stderr: string }).stderr).toContain('usage');
    });
  });
});
