import { SportKind } from '@stamina/contracts';
import type { Goal, Intensity, LaunchSport, Need, Units, Weekday } from '@stamina/domain';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
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

/** A SQL string literal for a code constant (never user input), so a check constraint is built from an enum. */
const literal = (value: string) => sql.raw(`'${value}'`);

/**
 * A code that lets one person in. It is redeemed when their profile is first saved (never when
 * typed), so someone turned away at onboarding does not burn it. Codes are issued by the
 * `invites:create` script on the connection role, and the public check reads them there too. The
 * app role may only see open codes (plus its own) and set the redemption columns.
 * A code is open while `redeemed_at` is null: `redeemed_by` is nulled when its user is deleted,
 * and that must never reopen a used code.
 */
export const invite = pgTable(
  'invite',
  {
    /** Canonical form (`normalizeInviteCode`). */
    code: text('code').primaryKey(),
    issuer: uuid('issuer').references(() => appUser.id, { onDelete: 'set null' }),
    redeemedBy: uuid('redeemed_by').references(() => appUser.id, { onDelete: 'set null' }),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy('invite_app_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`redeemed_at is null or redeemed_by = app_user_id()::uuid`,
    }),
    pgPolicy('invite_app_redeem', {
      for: 'update',
      to: APP_ROLE,
      using: sql`redeemed_at is null`,
      withCheck: sql`redeemed_by = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * What a person told Stamina in onboarding, one real column per answer (a profile is the core of
 * every later feature, so no JSON blob). Owner-only. Health-adjacent: never logged.
 */
export const profile = pgTable(
  'profile',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    needs: text('needs').$type<Need>().notNull(),
    birthYear: integer('birth_year').notNull(),
    country: text('country').notNull(),
    sportKind: text('sport_kind').$type<SportKind>().notNull(),
    /** Set when `sportKind` is `launch`. */
    launchSport: text('launch_sport').$type<LaunchSport>(),
    /** The user's own words; set when `sportKind` is `other`. */
    otherSportName: text('other_sport_name'),
    playDays: text('play_days').array().$type<Weekday[]>().notNull(),
    playVaries: boolean('play_varies').notNull(),
    playMinutes: integer('play_minutes').notNull(),
    playIntensity: text('play_intensity').$type<Intensity>().notNull(),
    goal: text('goal').$type<Goal>().notNull(),
    /** The three training week columns are all set, or all null for food only. */
    sessionsPerWeek: integer('sessions_per_week'),
    sessionMinutes: integer('session_minutes'),
    availableDays: text('available_days').array().$type<Weekday[]>(),
    /** A `Locale` code; the profile schemas check it on the way in and out. */
    locale: text('locale').notNull(),
    units: text('units').$type<Units>().notNull(),
    hotConditionsDefault: boolean('hot_conditions_default').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'profile_sport_matches_kind',
      sql`(${table.sportKind} = ${literal(SportKind.Launch)} and ${table.launchSport} is not null and ${table.otherSportName} is null)
        or (${table.sportKind} = ${literal(SportKind.Other)} and ${table.launchSport} is null and ${table.otherSportName} is not null)`,
    ),
    check(
      'profile_training_week_all_or_none',
      sql`(${table.sessionsPerWeek} is null) = (${table.sessionMinutes} is null)
        and (${table.sessionsPerWeek} is null) = (${table.availableDays} is null)`,
    ),
    pgPolicy('profile_owner', {
      for: 'all',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();
