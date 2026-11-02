import { SportKind } from '@stamina/contracts';
import {
  ConsentPurpose,
  ReferralKind,
  ScreeningStatus,
  StartingLevel,
  type BodyArea,
  type Goal,
  type Intensity,
  type LaunchSport,
  type Need,
  type Units,
  type Weekday,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
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

/** `column in ('a', 'b')` for the values of a code enum, so a check constraint can never drift from it. */
const isOneOf = (column: AnyPgColumn, values: readonly string[]) =>
  sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`;

/**
 * What a person agreed to, one row per grant. Append-only: the app role can read and insert its
 * own rows, and the only thing it can ever change is `withdrawn_at`, once, from null to a time
 * (column grant plus the update policy). A row is never rewritten or deleted by the app; it goes
 * only when its user does. `text_version` is the version of the text the person read, in `locale`.
 */
export const consent = pgTable(
  'consent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    purpose: text('purpose').$type<ConsentPurpose>().notNull(),
    textVersion: text('text_version').notNull(),
    locale: text('locale').$type<Locale>().notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  },
  (table) => [
    check('consent_purpose_valid', isOneOf(table.purpose, Object.values(ConsentPurpose))),
    check('consent_locale_valid', isOneOf(table.locale, Object.values(Locale))),
    // One active grant per purpose and text version: a repeated grant is a no-op, even concurrently.
    uniqueIndex('consent_active_grant')
      .on(table.userId, table.purpose, table.textVersion)
      .where(sql`${table.withdrawnAt} is null`),
    pgPolicy('consent_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('consent_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('consent_owner_withdraw', {
      for: 'update',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid and withdrawn_at is null`,
      withCheck: sql`user_id = app_user_id()::uuid and withdrawn_at is not null`,
    }),
  ],
).enableRLS();

/**
 * One Screening taken. The answers (and body areas) are one AES-GCM envelope in
 * `answers_encrypted` (`src/crypto`); the outcome sits beside them in plain columns because rules
 * read it on every request. Append-only like `consent`: a retake is a new row and the latest wins.
 * The only change the app role can make is stamping `doctor_ok_at` once, and only on a
 * general referral ("a doctor has said I can train"; pregnancy has no such path, and a cleared
 * row, whose referral is null, cannot be stamped: hence `is not distinct from`, not `=`).
 * Health data: never logged, returned only by the user's own export.
 */
export const screening = pgTable(
  'screening',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    instrument: text('instrument').notNull(),
    instrumentVersion: integer('instrument_version').notNull(),
    answersEncrypted: text('answers_encrypted').notNull(),
    status: text('status').$type<ScreeningStatus>().notNull(),
    /** Set exactly when `status` is `referred`. */
    referral: text('referral').$type<ReferralKind>(),
    nutritionOff: boolean('nutrition_off').notNull(),
    excludedAreas: text('excluded_areas').array().$type<BodyArea[]>().notNull(),
    startingLevel: text('starting_level').$type<StartingLevel>().notNull(),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
    doctorOkAt: timestamp('doctor_ok_at', { withTimezone: true }),
  },
  (table) => [
    check('screening_status_valid', isOneOf(table.status, Object.values(ScreeningStatus))),
    check(
      'screening_referral_valid',
      sql`${table.referral} is null or ${isOneOf(table.referral, Object.values(ReferralKind))}`,
    ),
    check(
      'screening_starting_level_valid',
      isOneOf(table.startingLevel, Object.values(StartingLevel)),
    ),
    check(
      'screening_referral_iff_referred',
      sql`(${table.referral} is not null) = (${table.status} = ${literal(ScreeningStatus.Referred)})`,
    ),
    check(
      'screening_doctor_ok_only_general',
      sql`${table.doctorOkAt} is null or ${table.referral} is not distinct from ${literal(ReferralKind.General)}`,
    ),
    index('screening_user_taken_at').on(table.userId, table.takenAt.desc()),
    pgPolicy('screening_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('screening_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('screening_owner_doctor_ok', {
      for: 'update',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid and doctor_ok_at is null`,
      withCheck: sql`user_id = app_user_id()::uuid and doctor_ok_at is not null`,
    }),
  ],
).enableRLS();
