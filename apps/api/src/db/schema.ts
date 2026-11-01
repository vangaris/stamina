import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { APP_ROLE } from './config.ts';

// Every table ships with its RLS policies and is only ever touched through `withUser`
// (see `with-user.ts`). Policies compare the owner column with `app_user_id()` (baseline migration).

/** One row per person, keyed by the Neon Auth user ID (the JWT `sub`). Created on first sign-in. */
export const appUser = pgTable(
  'app_user',
  {
    id: uuid('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy('app_user_owner', {
      for: 'all',
      to: APP_ROLE,
      using: sql`id = app_user_id()::uuid`,
      withCheck: sql`id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();
