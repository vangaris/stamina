import { userExportSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { FieldCipher } from '../crypto/index.ts';
import type { Db } from '../db/types.ts';
import type { AppEnv } from '../request-log.ts';
import { exportUserData } from '../safety/export-user-data.ts';

/** `GET /me/export`: everything held about the signed-in user, Screening answers decrypted. */
export function exportRoutes({
  db,
  auth,
  cipher,
}: {
  db: Db;
  auth: TokenVerifier;
  cipher: FieldCipher;
}) {
  const routes = new Hono<AppEnv>();
  routes.get('/', authenticate(auth), async (c) =>
    c.json(userExportSchema.parse(await exportUserData(db, cipher, requireUserId(c)))),
  );
  return routes;
}
