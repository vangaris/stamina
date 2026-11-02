import { HttpStatus, RecordStatus, recordDoctorOkResultSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import type { AppEnv } from '../request-log.ts';
import { recordDoctorOk } from '../safety/record-doctor-ok.ts';

/** `POST /screening/doctor-ok`: "a doctor has said I can train", for a general referral only. No body. */
export function doctorOkRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();
  routes.post('/', authenticate(auth), async (c) => {
    const result = recordDoctorOkResultSchema.parse(await recordDoctorOk(db, requireUserId(c)));
    return c.json(
      result,
      result.status === RecordStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
    );
  });
  return routes;
}
