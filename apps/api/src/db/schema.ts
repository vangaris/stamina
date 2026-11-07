import {
  SportKind,
  type ExerciseImage,
  type SportProfile,
  type SportSource,
} from '@stamina/contracts';
import {
  AdaptationRule,
  AdaptationStatus,
  BodyArea,
  ConsentPurpose,
  Emphasis,
  Equipment,
  EXERCISE_IMAGE_ORIGIN,
  ExerciseLicence,
  ExerciseLocation,
  ExerciseSource,
  LoadGuidance,
  MovementPattern,
  PrescriptionUnit,
  OTHER_SPORT_NAME_MAX_LENGTH,
  SPORT_NORMALIZED_NAME_MAX_LENGTH,
  ReferralKind,
  ScreeningStatus,
  SESSION_LENGTHS_MINUTES,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  SportStatus,
  StartingLevel,
  MAX_LOGGED_REPS,
  MAX_LOGGED_SETS,
  MAX_RIR,
  MAX_SESSION_MINUTES,
  MAX_SESSION_RPE,
  MAX_SET_RPE,
  MAX_WEIGHT_KG,
  MIN_SESSION_RPE,
  MIN_SET_RPE,
  WEEKS_IN_BLOCK,
  ActivitySource,
  Intensity,
  MAX_PLAY_MINUTES,
  MIN_PLAY_MINUTES,
  MAX_CHECKIN_SCORE,
  MIN_CHECKIN_SCORE,
  StopFlag,
  Weekday,
  type AdaptationChange,
  type AdaptationReasonParams,
  type Goal,
  type LaunchSport,
  type Need,
  type SessionRevisionRef,
  type Units,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { APP_ROLE } from './config.ts';
import { AiPurpose } from '../ai/enums/ai-purpose.ts';
import { LlmOutcome } from '../ai/enums/llm-outcome.ts';
import { PICK_REASON_MAX_LENGTH } from '../picks/config.ts';

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

/** `column <@ ARRAY['a', 'b']`: every element of a text[] column is a value of a code enum. */
const hasOnly = (column: AnyPgColumn, values: readonly string[]) =>
  sql`${column} <@ ARRAY[${sql.raw(values.map((value) => `'${value}'`).join(', '))}]::text[]`;

/**
 * The curated exercise library: reference data, the same for everyone. Written only by the
 * migration and sync owner (`sync-exercise-library`, run by `migrate()`); `stamina_app` can read
 * and nothing else (SELECT grant plus a read-only policy; RLS is enabled but not forced, so the
 * owner can write). Enum-like columns are text with check constraints built from the domain enums.
 * `easier_id` and `harder_id` are links inside the library (no action on delete: the sync nulls or
 * rewrites links before it removes a row).
 */
export const exercise = pgTable(
  'exercise',
  {
    id: text('id').primaryKey(),
    source: text('source').$type<ExerciseSource>().notNull(),
    sourceId: text('source_id').notNull(),
    licence: text('licence').$type<ExerciseLicence>().notNull(),
    nameEn: text('name_en').notNull(),
    nameEl: text('name_el'),
    instructionsEn: text('instructions_en').array().notNull(),
    instructionsEl: text('instructions_el').array(),
    equipment: text('equipment').array().$type<Equipment[]>().notNull(),
    locations: text('locations').array().$type<ExerciseLocation[]>().notNull(),
    movementPattern: text('movement_pattern').$type<MovementPattern>().notNull(),
    highLoadAreas: text('high_load_areas').array().$type<BodyArea[]>().notNull(),
    slots: text('slots').array().$type<SessionSlot[]>().notNull(),
    rirSuitable: boolean('rir_suitable').notNull(),
    easierId: text('easier_id').references((): AnyPgColumn => exercise.id),
    harderId: text('harder_id').references((): AnyPgColumn => exercise.id),
    image: jsonb('image').$type<ExerciseImage>(),
  },
  (table) => [
    check('exercise_source_valid', isOneOf(table.source, Object.values(ExerciseSource))),
    check('exercise_licence_valid', isOneOf(table.licence, Object.values(ExerciseLicence))),
    check(
      'exercise_movement_pattern_valid',
      isOneOf(table.movementPattern, Object.values(MovementPattern)),
    ),
    check('exercise_equipment_valid', hasOnly(table.equipment, Object.values(Equipment))),
    check('exercise_locations_valid', hasOnly(table.locations, Object.values(ExerciseLocation))),
    check('exercise_high_load_areas_valid', hasOnly(table.highLoadAreas, Object.values(BodyArea))),
    check('exercise_slots_valid', hasOnly(table.slots, Object.values(SessionSlot))),
    check('exercise_slots_count', sql`cardinality(${table.slots}) between 1 and 2`),
    check('exercise_locations_not_empty', sql`cardinality(${table.locations}) > 0`),
    check('exercise_instructions_not_empty', sql`cardinality(${table.instructionsEn}) > 0`),
    check('exercise_easier_not_self', sql`${table.easierId} is distinct from ${table.id}`),
    check('exercise_harder_not_self', sql`${table.harderId} is distinct from ${table.id}`),
    check(
      'exercise_image_on_wger',
      sql`${table.image} is null or coalesce(starts_with(${table.image}->>'url', ${literal(EXERCISE_IMAGE_ORIGIN)}), false)`,
    ),
    pgPolicy('exercise_read', { for: 'select', to: APP_ROLE, using: sql`true` }),
  ],
).enableRLS();

/**
 * The sport catalogue: reference data in one table. The launch sports are seeded as drafts from
 * `sports/data` (insert-if-missing, so the founder's edits survive) and approved by hand in the
 * database table editor; a user's "Other..." sport is a draft too, one per `normalized_name`
 * (`request_sport`, migration 0005). `stamina_app` can only read, and only what the policy lets
 * through: approved sports for everyone, drafts for the people who requested them, rejected sports
 * for nobody. RLS is enabled, not forced, so the owner and the table editor can write. A sport
 * with no `profile` yet is an undrafted request. `id` is the `LaunchSport` value for a launch
 * sport and a UUID string for any other.
 */
export const sport = pgTable(
  'sport',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** `normalizeSportName(name)`: two spellings of one sport are one row. */
    normalizedName: text('normalized_name').notNull().unique(),
    status: text('status').$type<SportStatus>().notNull(),
    profile: jsonb('profile').$type<SportProfile>(),
    sources: jsonb('sources').$type<SportSource[]>(),
    version: integer('version').notNull().default(1),
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('sport_status_valid', isOneOf(table.status, Object.values(SportStatus))),
    check(
      'sport_name_length',
      sql`char_length(${table.name}) between 1 and ${sql.raw(String(OTHER_SPORT_NAME_MAX_LENGTH))}`,
    ),
    check(
      'sport_normalized_name_valid',
      sql`${table.normalizedName} <> '' and char_length(${table.normalizedName}) <= ${sql.raw(String(SPORT_NORMALIZED_NAME_MAX_LENGTH))}`,
    ),
    check(
      'sport_approved_is_complete',
      sql`${table.status} <> ${literal(SportStatus.Approved)}
        or (${table.profile} is not null and ${table.sources} is not null
          and ${table.approvedBy} is not null and ${table.approvedAt} is not null)`,
    ),
    pgPolicy('sport_visible', {
      for: 'select',
      to: APP_ROLE,
      using: sql`status = ${literal(SportStatus.Approved)}
        or (status = ${literal(SportStatus.Draft)} and exists (
          select 1 from sport_request r where r.sport_id = sport.id and r.user_id = app_user_id()::uuid))`,
    }),
  ],
).enableRLS();

/**
 * Who asked for a sport. The app role can only read its own rows (SELECT grant and policy): it
 * cannot insert, so it cannot join a sport it does not know the draft of. Rows are created and
 * released by `request_sport` and `release_sport_request`, which run as the owner and always use
 * the caller's `app_user_id()`.
 */
export const sportRequest = pgTable(
  'sport_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sportId: text('sport_id')
      .notNull()
      .references(() => sport.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('sport_request_sport_user').on(table.sportId, table.userId),
    pgPolicy('sport_request_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * A person's Program: one row per user (unique index), created once by `POST /program` under
 * `lockUser`. Append-only like `consent`: the app role can read and insert its own rows, and a
 * row goes only when its user does. The Block, Session and exercise tables below follow the same
 * rules. Everything in them is the person's training plan; it carries no Screening answers.
 */
export const program = pgTable(
  'program',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy('program_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('program_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One Block of a Program (four weeks, one Emphasis). `starts_on` is the first day of its week 1;
 * week N starts `(N - 1) * 7` days later. Block 1 is the reveal Block.
 */
export const block = pgTable(
  'block',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    programId: uuid('program_id')
      .notNull()
      .references(() => program.id, { onDelete: 'cascade' }),
    /** 1 for the first Block. */
    position: integer('position').notNull(),
    emphasis: text('emphasis').$type<Emphasis>().notNull(),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('block_emphasis_valid', isOneOf(table.emphasis, Object.values(Emphasis))),
    check('block_position_positive', sql`${table.position} >= 1`),
    unique('block_program_position').on(table.programId, table.position),
    pgPolicy('block_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('block_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One planned Session. Reproducibility record: `rules_version` and `inputs_hash` say which rules
 * and which inputs made it (the same inputs under the same rules give the same Session), `model`
 * and `prompt_version` are null while no AI picked exercises, `revision` counts rewrites and
 * `supersedes_id` points at the Session a revision replaced.
 */
export const session = pgTable(
  'session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    blockId: uuid('block_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    weekInBlock: integer('week_in_block').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    weekday: text('weekday').$type<Weekday>().notNull(),
    focus: text('focus').$type<SessionFocus>().notNull(),
    minutes: integer('minutes').notNull(),
    status: text('status').$type<SessionStatus>().notNull(),
    /** Limited mode caps were applied to this week. */
    limited: boolean('limited').notNull(),
    /** The person's sport is a requested one that is not approved yet. */
    beta: boolean('beta').notNull(),
    revision: integer('revision').notNull(),
    supersedesId: uuid('supersedes_id').references((): AnyPgColumn => session.id),
    rulesVersion: integer('rules_version').notNull(),
    model: text('model'),
    promptVersion: text('prompt_version'),
    inputsHash: text('inputs_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'session_week_in_block_valid',
      sql`${table.weekInBlock} between 1 and ${sql.raw(String(WEEKS_IN_BLOCK))}`,
    ),
    check('session_weekday_valid', isOneOf(table.weekday, Object.values(Weekday))),
    check('session_focus_valid', isOneOf(table.focus, Object.values(SessionFocus))),
    check(
      'session_minutes_valid',
      sql`${table.minutes} in (${sql.raw(SESSION_LENGTHS_MINUTES.join(', '))})`,
    ),
    check('session_status_valid', isOneOf(table.status, Object.values(SessionStatus))),
    check('session_revision_positive', sql`${table.revision} >= 1`),
    check('session_rules_version_positive', sql`${table.rulesVersion} >= 1`),
    check('session_inputs_hash_valid', sql`${table.inputsHash} ~ '^[0-9a-f]{64}$'`),
    check(
      'session_ai_pick_recorded',
      sql`(${table.model} is null) = (${table.promptVersion} is null)`,
    ),
    unique('session_block_date_revision').on(table.blockId, table.date, table.revision),
    index('session_user_date').on(table.userId, table.date),
    index('session_supersedes').on(table.supersedesId),
    pgPolicy('session_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('session_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One exercise of a Session with its prescription, in the order it is done (`position`). The
 * exercise is a foreign key into the library with no cascade: the library sync cannot retire an
 * exercise a stored Session uses (see `sync-exercise-library`).
 */
export const sessionExercise = pgTable(
  'session_exercise',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    slot: text('slot').$type<SessionSlot>().notNull(),
    sets: integer('sets').notNull(),
    repMin: integer('rep_min').notNull(),
    repMax: integer('rep_max').notNull(),
    unit: text('unit').$type<PrescriptionUnit>().notNull(),
    /** Reps in reserve; null where effort is not rated. */
    rir: integer('rir'),
    loadGuidance: text('load_guidance').$type<LoadGuidance>().notNull(),
    /** The AI's one-line reason for this pick; null when the rules picked it. Never shown. */
    pickReason: text('pick_reason'),
  },
  (table) => [
    check('session_exercise_slot_valid', isOneOf(table.slot, Object.values(SessionSlot))),
    check('session_exercise_unit_valid', isOneOf(table.unit, Object.values(PrescriptionUnit))),
    check(
      'session_exercise_load_guidance_valid',
      isOneOf(table.loadGuidance, Object.values(LoadGuidance)),
    ),
    check('session_exercise_sets_positive', sql`${table.sets} >= 1`),
    check(
      'session_exercise_reps_valid',
      sql`${table.repMin} >= 1 and ${table.repMax} >= ${table.repMin}`,
    ),
    check(
      'session_exercise_rir_valid',
      sql`${table.rir} is null or ${table.rir} between 0 and ${sql.raw(String(MAX_RIR))}`,
    ),
    check(
      'session_exercise_pick_reason_length',
      sql`${table.pickReason} is null or char_length(${table.pickReason}) <= ${sql.raw(String(PICK_REASON_MAX_LENGTH))}`,
    ),
    unique('session_exercise_session_position').on(table.sessionId, table.position),
    pgPolicy('session_exercise_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('session_exercise_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One logged set. The id is made on the device, so a replay is a conflict the insert ignores; so
 * is a second set with the same number for the same Session exercise. `exercise_id` is the
 * exercise actually done: the planned one or its tagged easier or harder variant (the API checks).
 * Append-only: the app role reads and inserts its own rows, never rewrites or deletes them.
 * Weight is read as a JS number; the checks use the domain's logging limits.
 */
export const setLog = pgTable(
  'set_log',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    sessionExerciseId: uuid('session_exercise_id')
      .notNull()
      .references(() => sessionExercise.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    setNumber: integer('set_number').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }).notNull(),
    /** Reps, or seconds for a timed hold. */
    reps: integer('reps').notNull(),
    rpe: integer('rpe').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'set_log_set_number_valid',
      sql`${table.setNumber} between 1 and ${sql.raw(String(MAX_LOGGED_SETS))}`,
    ),
    check(
      'set_log_weight_valid',
      sql`${table.weightKg} between 0 and ${sql.raw(String(MAX_WEIGHT_KG))}`,
    ),
    check(
      'set_log_reps_valid',
      sql`${table.reps} between 0 and ${sql.raw(String(MAX_LOGGED_REPS))}`,
    ),
    check(
      'set_log_rpe_valid',
      sql`${table.rpe} between ${sql.raw(String(MIN_SET_RPE))} and ${sql.raw(String(MAX_SET_RPE))}`,
    ),
    unique('set_log_session_exercise_set_number').on(table.sessionExerciseId, table.setNumber),
    index('set_log_user_exercise').on(table.userId, table.exerciseId),
    index('set_log_session').on(table.sessionId),
    pgPolicy('set_log_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('set_log_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * A Session's finish record: the session RPE, the minutes it took and the Load (RPE x minutes,
 * `sessionLoad`). One per Session (unique), so a second finish is a conflict the insert ignores.
 * A Session is completed exactly when it has one; `session.status` is never rewritten (the app
 * role cannot UPDATE it). Append-only like `set_log`.
 */
export const sessionLog = pgTable(
  'session_log',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .unique()
      .references(() => session.id, { onDelete: 'cascade' }),
    rpe: integer('rpe').notNull(),
    minutes: integer('minutes').notNull(),
    load: integer('load').notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'session_log_rpe_valid',
      sql`${table.rpe} between ${sql.raw(String(MIN_SESSION_RPE))} and ${sql.raw(String(MAX_SESSION_RPE))}`,
    ),
    check(
      'session_log_minutes_valid',
      sql`${table.minutes} between 1 and ${sql.raw(String(MAX_SESSION_MINUTES))}`,
    ),
    check('session_log_load_valid', sql`${table.load} = ${table.rpe} * ${table.minutes}`),
    pgPolicy('session_log_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('session_log_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One logged Activity ("I played"): the sport, the day, the minutes and intensity, with the RPE
 * the intensity counts as and the Load (RPE x minutes, `activityLoad`), both set by the server.
 * `planned` is whether the day was one of the person's play days when it was logged. The id is made
 * on the device, so a replay is a conflict the insert ignores. Append-only like `session_log`: the
 * app role reads and inserts its own rows and never rewrites or deletes them.
 */
export const activity = pgTable(
  'activity',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    sportKind: text('sport_kind').$type<SportKind>().notNull(),
    /** Set when `sportKind` is `launch`. */
    launchSport: text('launch_sport').$type<LaunchSport>(),
    /** The user's own words; set when `sportKind` is `other`. */
    otherSportName: text('other_sport_name'),
    date: date('date', { mode: 'string' }).notNull(),
    minutes: integer('minutes').notNull(),
    intensity: text('intensity').$type<Intensity>().notNull(),
    rpe: integer('rpe').notNull(),
    load: integer('load').notNull(),
    planned: boolean('planned').notNull(),
    hot: boolean('hot').notNull(),
    source: text('source').$type<ActivitySource>().notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'activity_sport_matches_kind',
      sql`(${table.sportKind} = ${literal(SportKind.Launch)} and ${table.launchSport} is not null and ${table.otherSportName} is null)
        or (${table.sportKind} = ${literal(SportKind.Other)} and ${table.launchSport} is null and ${table.otherSportName} is not null)`,
    ),
    check(
      'activity_minutes_valid',
      sql`${table.minutes} between ${sql.raw(String(MIN_PLAY_MINUTES))} and ${sql.raw(String(MAX_PLAY_MINUTES))}`,
    ),
    check('activity_intensity_valid', isOneOf(table.intensity, Object.values(Intensity))),
    check(
      'activity_rpe_valid',
      sql`${table.rpe} between ${sql.raw(String(MIN_SESSION_RPE))} and ${sql.raw(String(MAX_SESSION_RPE))}`,
    ),
    check('activity_load_valid', sql`${table.load} = ${table.rpe} * ${table.minutes}`),
    check('activity_source_valid', isOneOf(table.source, Object.values(ActivitySource))),
    index('activity_user_date').on(table.userId, table.date),
    pgPolicy('activity_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('activity_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One daily Check-in: sleep, soreness and energy, each 1..5. The id is made on the device, so a
 * replay is a conflict the insert ignores. Append-only like `activity`: the app role reads and
 * inserts its own rows and never rewrites or deletes them. Health data: never logged.
 */
export const checkin = pgTable(
  'checkin',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    sleep: integer('sleep').notNull(),
    soreness: integer('soreness').notNull(),
    energy: integer('energy').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'checkin_sleep_valid',
      sql`${table.sleep} between ${sql.raw(String(MIN_CHECKIN_SCORE))} and ${sql.raw(String(MAX_CHECKIN_SCORE))}`,
    ),
    check(
      'checkin_soreness_valid',
      sql`${table.soreness} between ${sql.raw(String(MIN_CHECKIN_SCORE))} and ${sql.raw(String(MAX_CHECKIN_SCORE))}`,
    ),
    check(
      'checkin_energy_valid',
      sql`${table.energy} between ${sql.raw(String(MIN_CHECKIN_SCORE))} and ${sql.raw(String(MAX_CHECKIN_SCORE))}`,
    ),
    index('checkin_user_date').on(table.userId, table.date),
    pgPolicy('checkin_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('checkin_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One reported stop flag ("anything unusual today?"). The id is made on the device, so a replay is
 * a conflict the insert ignores. Append-only like `consent`: the app role reads and inserts its own
 * rows, and the only change it can make is stamping `confirmed_at` once ("a doctor has seen me" /
 * "cleared"), from null to a time (column grant plus the update policy). `body_area` is set exactly
 * for `new-pain`. `session_id` is the Session it was reported from, when it is the person's own.
 * Health data: never logged, returned only by the user's own export.
 */
export const stopFlag = pgTable(
  'stop_flag',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    flag: text('flag').$type<StopFlag>().notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    bodyArea: text('body_area').$type<BodyArea>(),
    sessionId: uuid('session_id').references(() => session.id, { onDelete: 'set null' }),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  },
  (table) => [
    check('stop_flag_flag_valid', isOneOf(table.flag, Object.values(StopFlag))),
    check(
      'stop_flag_body_area_valid',
      sql`${table.bodyArea} is null or ${isOneOf(table.bodyArea, Object.values(BodyArea))}`,
    ),
    check(
      'stop_flag_area_iff_new_pain',
      sql`(${table.bodyArea} is not null) = (${table.flag} = ${literal(StopFlag.NewPain)})`,
    ),
    index('stop_flag_user_date').on(table.userId, table.date),
    pgPolicy('stop_flag_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('stop_flag_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('stop_flag_owner_confirm', {
      for: 'update',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid and confirmed_at is null`,
      withCheck: sql`user_id = app_user_id()::uuid and confirmed_at is not null`,
    }),
  ],
).enableRLS();

/**
 * One Adaptation: a suggestion the rules raised, stored once and never rewritten. `rule_id` and
 * `trigger_key` name the facts it was raised on (an Activity id, a Check-in id, a week's first day),
 * so the same facts raise it once; `ask` counts a declined Deload asked again. `change`, `params`
 * and `basis` are the domain's change, the whole numbers its reason is filled with and the Session
 * revisions it was raised on. Whether it was accepted or declined is the separate
 * `adaptation_decision` row, so a suggestion with none is pending. Append-only like `activity`: the
 * app role reads and inserts its own rows and never rewrites or deletes them. Health-adjacent:
 * never logged.
 */
export const adaptation = pgTable(
  'adaptation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    ruleId: text('rule_id').$type<AdaptationRule>().notNull(),
    triggerKey: text('trigger_key').notNull(),
    ask: integer('ask').notNull().default(1),
    change: jsonb('change').$type<AdaptationChange>().notNull(),
    params: jsonb('params').$type<AdaptationReasonParams>().notNull(),
    basis: jsonb('basis').$type<SessionRevisionRef[]>().notNull(),
    /** The last day the suggestion is worth showing; null until used or declined. */
    validUntil: date('valid_until', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('adaptation_rule_valid', isOneOf(table.ruleId, Object.values(AdaptationRule))),
    check('adaptation_ask_positive', sql`${table.ask} >= 1`),
    unique('adaptation_user_rule_trigger_ask').on(
      table.userId,
      table.ruleId,
      table.triggerKey,
      table.ask,
    ),
    index('adaptation_user_created').on(table.userId, table.createdAt),
    pgPolicy('adaptation_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('adaptation_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * The person's answer to an Adaptation: accepted ("Accept") or declined ("Keep my plan"). One per
 * Adaptation (its primary key), so a second decision is a conflict the insert ignores and the
 * first wins. Append-only like `adaptation`.
 */
export const adaptationDecision = pgTable(
  'adaptation_decision',
  {
    adaptationId: uuid('adaptation_id')
      .primaryKey()
      .references(() => adaptation.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    decision: text('decision')
      .$type<AdaptationStatus.Accepted | AdaptationStatus.Declined>()
      .notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'adaptation_decision_valid',
      isOneOf(table.decision, [AdaptationStatus.Accepted, AdaptationStatus.Declined]),
    ),
    pgPolicy('adaptation_decision_owner_select', {
      for: 'select',
      to: APP_ROLE,
      using: sql`user_id = app_user_id()::uuid`,
    }),
    pgPolicy('adaptation_decision_owner_insert', {
      for: 'insert',
      to: APP_ROLE,
      withCheck: sql`user_id = app_user_id()::uuid`,
    }),
  ],
).enableRLS();

/**
 * One model call that reached the provider, for cost control and audit (spec "AI layer"). The
 * user is a pseudonym (`pseudonymizeUser`), never an id, so the table holds no personal data and
 * has no owner column: it carries no row-level policy and `stamina_app` has no privilege on it.
 * Only the API's own connection (the table owner) writes and reads it, through the AI gateway.
 * `cost_micro_usd` is whole millionths of a US dollar. `detail` is a short code (the validator's
 * or the failure's), never any prompt or answer text.
 */
export const llmCall = pgTable(
  'llm_call',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    /** Null for work that is not about a person (the founder's Sport Profile draft). */
    userPseudonym: text('user_pseudonym'),
    purpose: text('purpose').$type<AiPurpose>().notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    costMicroUsd: integer('cost_micro_usd').notNull(),
    outcome: text('outcome').$type<LlmOutcome>().notNull(),
    detail: text('detail'),
  },
  (table) => [
    check('llm_call_purpose_valid', isOneOf(table.purpose, Object.values(AiPurpose))),
    check('llm_call_outcome_valid', isOneOf(table.outcome, Object.values(LlmOutcome))),
    check(
      'llm_call_usage_valid',
      sql`${table.inputTokens} >= 0 and ${table.outputTokens} >= 0 and ${table.costMicroUsd} >= 0`,
    ),
    index('llm_call_user_at').on(table.userPseudonym, table.at),
    index('llm_call_at').on(table.at),
  ],
).enableRLS();
