import { DayType } from './enums/day-type.ts';
import { EnergySex } from './enums/energy-sex.ts';
import { EverydayActivity } from './enums/everyday-activity.ts';
import { MealSlot } from './enums/meal-slot.ts';
import { AdaptationRule } from './enums/adaptation-rule.ts';
import { BodyHalf } from './enums/body-half.ts';
import { ConsentPurpose } from './enums/consent-purpose.ts';
import { Emphasis } from './enums/emphasis.ts';
import { Equipment } from './enums/equipment.ts';
import { Intensity } from './enums/intensity.ts';
import { LaunchSport } from './enums/launch-sport.ts';
import { MovementPattern } from './enums/movement-pattern.ts';
import { ScreeningQuestion } from './enums/screening-question.ts';
import { SessionFocus } from './enums/session-focus.ts';
import { SessionSlot } from './enums/session-slot.ts';
import { SportMovement } from './enums/sport-movement.ts';
import { StopAction } from './enums/stop-action.ts';
import { StopFlag } from './enums/stop-flag.ts';
import { Weekday } from './enums/weekday.ts';
import type { StopFlagEffect } from './types.ts';

/** Stamina is for adults. Age is the difference between the current year and the birth year. */
export const ADULT_AGE = 18;
/** Earliest birth year the form accepts, so a typo is caught before it reaches the rules. */
export const MIN_BIRTH_YEAR = 1900;

export const MIN_SESSIONS_PER_WEEK = 2;
export const MAX_SESSIONS_PER_WEEK = 4;
/** Session lengths in minutes the training week offers. */
export const SESSION_LENGTHS_MINUTES = [30, 45, 60] as const;

/** Usual time on the court, water or pitch, in minutes. */
export const MIN_PLAY_MINUTES = 15;
export const MAX_PLAY_MINUTES = 300;

export const OTHER_SPORT_NAME_MAX_LENGTH = 60;
/** What `normalizeSportName` may produce at most (compatibility decomposition can lengthen a name). */
export const SPORT_NORMALIZED_NAME_MAX_LENGTH = 120;
/**
 * How many sports one person may have requested that are not approved yet. Asking again for a
 * sport already asked for is free. The `request_sport` SQL function (migration 0005) enforces
 * the same number; a test keeps the two equal.
 */
export const MAX_SPORT_REQUESTS_PER_USER = 5;

/** Sports where "hot conditions" is on by default in summer. */
export const HOT_DEFAULT_SPORTS: readonly LaunchSport[] = [
  LaunchSport.Kitesurfing,
  LaunchSport.Windsurfing,
  LaunchSport.BeachVolleyball,
];

/** ISO 3166-1 alpha-2 codes of the EU and EEA countries; the only residents the beta admits. */
export const EEA_COUNTRY_CODES: readonly string[] = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
];

/** Every ISO 3166-1 alpha-2 code the country picker offers. Names come from `Intl.DisplayNames`. */
export const COUNTRY_CODES: readonly string[] = [
  'AD',
  'AE',
  'AF',
  'AG',
  'AI',
  'AL',
  'AM',
  'AO',
  'AQ',
  'AR',
  'AS',
  'AT',
  'AU',
  'AW',
  'AX',
  'AZ',
  'BA',
  'BB',
  'BD',
  'BE',
  'BF',
  'BG',
  'BH',
  'BI',
  'BJ',
  'BL',
  'BM',
  'BN',
  'BO',
  'BQ',
  'BR',
  'BS',
  'BT',
  'BV',
  'BW',
  'BY',
  'BZ',
  'CA',
  'CC',
  'CD',
  'CF',
  'CG',
  'CH',
  'CI',
  'CK',
  'CL',
  'CM',
  'CN',
  'CO',
  'CR',
  'CU',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ',
  'DE',
  'DJ',
  'DK',
  'DM',
  'DO',
  'DZ',
  'EC',
  'EE',
  'EG',
  'EH',
  'ER',
  'ES',
  'ET',
  'FI',
  'FJ',
  'FK',
  'FM',
  'FO',
  'FR',
  'GA',
  'GB',
  'GD',
  'GE',
  'GF',
  'GG',
  'GH',
  'GI',
  'GL',
  'GM',
  'GN',
  'GP',
  'GQ',
  'GR',
  'GS',
  'GT',
  'GU',
  'GW',
  'GY',
  'HK',
  'HM',
  'HN',
  'HR',
  'HT',
  'HU',
  'ID',
  'IE',
  'IL',
  'IM',
  'IN',
  'IO',
  'IQ',
  'IR',
  'IS',
  'IT',
  'JE',
  'JM',
  'JO',
  'JP',
  'KE',
  'KG',
  'KH',
  'KI',
  'KM',
  'KN',
  'KP',
  'KR',
  'KW',
  'KY',
  'KZ',
  'LA',
  'LB',
  'LC',
  'LI',
  'LK',
  'LR',
  'LS',
  'LT',
  'LU',
  'LV',
  'LY',
  'MA',
  'MC',
  'MD',
  'ME',
  'MF',
  'MG',
  'MH',
  'MK',
  'ML',
  'MM',
  'MN',
  'MO',
  'MP',
  'MQ',
  'MR',
  'MS',
  'MT',
  'MU',
  'MV',
  'MW',
  'MX',
  'MY',
  'MZ',
  'NA',
  'NC',
  'NE',
  'NF',
  'NG',
  'NI',
  'NL',
  'NO',
  'NP',
  'NR',
  'NU',
  'NZ',
  'OM',
  'PA',
  'PE',
  'PF',
  'PG',
  'PH',
  'PK',
  'PL',
  'PM',
  'PN',
  'PR',
  'PS',
  'PT',
  'PW',
  'PY',
  'QA',
  'RE',
  'RO',
  'RS',
  'RU',
  'RW',
  'SA',
  'SB',
  'SC',
  'SD',
  'SE',
  'SG',
  'SH',
  'SI',
  'SJ',
  'SK',
  'SL',
  'SM',
  'SN',
  'SO',
  'SR',
  'SS',
  'ST',
  'SV',
  'SX',
  'SY',
  'SZ',
  'TC',
  'TD',
  'TF',
  'TG',
  'TH',
  'TJ',
  'TK',
  'TL',
  'TM',
  'TN',
  'TO',
  'TR',
  'TT',
  'TV',
  'TW',
  'TZ',
  'UA',
  'UG',
  'UM',
  'US',
  'UY',
  'UZ',
  'VA',
  'VC',
  'VE',
  'VG',
  'VI',
  'VN',
  'VU',
  'WF',
  'WS',
  'YE',
  'YT',
  'ZA',
  'ZM',
  'ZW',
];

/** Invite codes: unambiguous characters only (no 0/O, 1/I/L), so they survive being read aloud. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 10;

/** Longest invite code input accepted anywhere (typed or pasted, spaces and hyphens included). */
export const INVITE_CODE_INPUT_MAX_LENGTH = 64;

/** Screening wording is Stamina's own, never called PAR-Q+ or "validated". */
export const SCREENING_INSTRUMENT = 'stamina-own';
/** Bumped whenever a question or an outcome rule changes, so old answers stay readable. */
export const SCREENING_INSTRUMENT_VERSION = 1;

/** The questions in the order the page shows them. */
export const SCREENING_QUESTIONS: readonly ScreeningQuestion[] = [
  ScreeningQuestion.HeartCondition,
  ScreeningQuestion.ChestPain,
  ScreeningQuestion.Fainting,
  ScreeningQuestion.DiabetesOrKidney,
  ScreeningQuestion.Breathing,
  ScreeningQuestion.BoneJointMuscle,
  ScreeningQuestion.HeadInjury,
  ScreeningQuestion.Pregnancy,
  ScreeningQuestion.SupervisedExercise,
  ScreeningQuestion.EatingDisorder,
];

/** A yes to any of these refers the person to a professional before a Program. */
export const REFERRAL_QUESTIONS: readonly ScreeningQuestion[] = [
  ScreeningQuestion.HeartCondition,
  ScreeningQuestion.ChestPain,
  ScreeningQuestion.Fainting,
  ScreeningQuestion.DiabetesOrKidney,
  ScreeningQuestion.Breathing,
  ScreeningQuestion.HeadInjury,
  ScreeningQuestion.Pregnancy,
  ScreeningQuestion.SupervisedExercise,
];

/** Version of each consent text (the EN and EL texts change together), recorded with every grant. */
export const CONSENT_TEXT_VERSIONS: Readonly<Record<ConsentPurpose, string>> = {
  [ConsentPurpose.Disclaimer]: 'disclaimer-v1',
  [ConsentPurpose.HealthData]: 'health-data-v1',
};

/** What a person is assumed to have until they say otherwise: bodyweight and dumbbells. */
export const DEFAULT_EQUIPMENT: readonly Equipment[] = [Equipment.Dumbbell];
/** An exercise image must be served by wger itself, unmodified. */
export const EXERCISE_IMAGE_ORIGIN = 'https://wger.de/media/';

/** A Sport Profile's energy mix is three shares of effort that add up to this. */
export const ENERGY_MIX_TOTAL = 100;
/** Plausible bounds for the METs of one effort level (resting is 1). */
export const MIN_METS = 1.5;
export const MAX_METS = 18;
/** Longest recovery window a Sport Profile may ask for, in hours. */
export const MAX_RECOVERY_HOURS = 96;
export const MAX_KEY_MOVEMENTS = 6;
export const MAX_SPORT_HIGH_LOAD_AREAS = 5;
/** A Sport Profile must cite at least this many sources. */
export const MIN_SPORT_SOURCES = 2;
/** A Sport Profile's season names months 1 to this number. */
export const MONTHS_IN_YEAR = 12;

/**
 * Bumped whenever a number or a rule of program generation changes, so a stored Session says
 * which rules made it. The same inputs under the same version always give the same Session.
 */
export const RULES_VERSION = 1;

/** Weeks in a Block; the last one is the Deload. */
export const WEEKS_IN_BLOCK = 4;
export const DELOAD_WEEK_IN_BLOCK = 4;
/** Sets of a Deload week are the build week's sets times this, rounded up, never below one. */
export const DELOAD_SET_FACTOR = 0.5;
/** Reps in reserve for week 1, 2, 3 and 4 of a Block (index = week - 1). Week 4 is the Deload. */
export const BLOCK_RIR_BY_WEEK: readonly number[] = [3, 2, 1, 4];
/** The highest reps-in-reserve a Session exercise can carry (the Deload week asks for the most, 4). */
export const MAX_RIR = 5;
/** Limited mode never goes closer to failure than this (RPE 7). */
export const LIMITED_RIR_FLOOR = 3;
/** Power and speed work is never closer to failure than this. */
export const POWER_SPEED_RIR_FLOOR = 3;
/** Sport-support work stops at least this far from failure. */
export const SPORT_SUPPORT_RIR_FLOOR = 3;
/** Accessories stop at least this far from failure. */
export const ACCESSORY_RIR_FLOOR = 2;

/** A numeric prescription: how many sets, and the rep range (or seconds for a hold). */
interface PrescriptionRange {
  sets: number;
  repMin: number;
  repMax: number;
}

/** Main-strength sets and reps for each Emphasis. */
export const MAIN_STRENGTH_PRESCRIPTION: Readonly<Record<Emphasis, PrescriptionRange>> = {
  [Emphasis.Strength]: { sets: 4, repMin: 4, repMax: 6 },
  [Emphasis.PowerSpeed]: { sets: 4, repMin: 3, repMax: 5 },
  [Emphasis.StrengthEndurance]: { sets: 3, repMin: 10, repMax: 15 },
};
/** Sport-support work: PowerSpeed uses fewer, faster reps. */
export const SPORT_SUPPORT_PRESCRIPTION: Readonly<Record<Emphasis, PrescriptionRange>> = {
  [Emphasis.Strength]: { sets: 3, repMin: 5, repMax: 8 },
  [Emphasis.PowerSpeed]: { sets: 3, repMin: 3, repMax: 5 },
  [Emphasis.StrengthEndurance]: { sets: 3, repMin: 5, repMax: 8 },
};
export const ACCESSORY_PRESCRIPTION: PrescriptionRange = { sets: 3, repMin: 8, repMax: 12 };
export const WARM_UP_PRESCRIPTION: PrescriptionRange = { sets: 1, repMin: 8, repMax: 10 };
/** Cool-down holds are counted in seconds. */
export const COOL_DOWN_PRESCRIPTION: PrescriptionRange = { sets: 1, repMin: 30, repMax: 45 };

/** Exercises per slot in one Session, by the minutes the person chose. */
export const SLOT_COUNTS_BY_MINUTES: Readonly<
  Record<number, Readonly<Record<SessionSlot, number>>>
> = {
  30: {
    [SessionSlot.WarmUp]: 2,
    [SessionSlot.MainStrength]: 2,
    [SessionSlot.SportSupport]: 1,
    [SessionSlot.AccessoriesCore]: 1,
    [SessionSlot.CoolDown]: 1,
  },
  45: {
    [SessionSlot.WarmUp]: 2,
    [SessionSlot.MainStrength]: 2,
    [SessionSlot.SportSupport]: 2,
    [SessionSlot.AccessoriesCore]: 2,
    [SessionSlot.CoolDown]: 1,
  },
  60: {
    [SessionSlot.WarmUp]: 3,
    [SessionSlot.MainStrength]: 3,
    [SessionSlot.SportSupport]: 2,
    [SessionSlot.AccessoriesCore]: 3,
    [SessionSlot.CoolDown]: 2,
  },
};

/** The slots in the order a Session does them. */
export const SLOT_ORDER: readonly SessionSlot[] = [
  SessionSlot.WarmUp,
  SessionSlot.MainStrength,
  SessionSlot.SportSupport,
  SessionSlot.AccessoriesCore,
  SessionSlot.CoolDown,
];

/** The slots a Recovery Session has: no main strength, no sport support. */
export const RECOVERY_SLOTS: readonly SessionSlot[] = [
  SessionSlot.WarmUp,
  SessionSlot.AccessoriesCore,
  SessionSlot.CoolDown,
];

/** Heavy main-strength patterns of each focus, in the order a Session fills them. */
export const MAIN_STRENGTH_PATTERNS: Readonly<
  Record<SessionFocus.Lower | SessionFocus.Upper, readonly MovementPattern[]>
> = {
  [SessionFocus.Lower]: [MovementPattern.Squat, MovementPattern.Hinge, MovementPattern.Lunge],
  [SessionFocus.Upper]: [MovementPattern.Push, MovementPattern.Pull, MovementPattern.Overhead],
};
/**
 * The patterns a Recovery Session's accessories take first; other accessory exercises that pass
 * the excluded areas fill in only when these run out (a lower-back exclusion removes them all).
 */
export const RECOVERY_ACCESSORY_PATTERNS: readonly MovementPattern[] = [
  MovementPattern.Core,
  MovementPattern.Mobility,
];
/** Patterns Limited mode never plans: power and plyometric work. */
export const LIMITED_EXCLUDED_PATTERNS: readonly MovementPattern[] = [
  MovementPattern.JumpLand,
  MovementPattern.ChangeOfDirection,
];
/** Limited mode has no sport-support slot: that slot's exercises are almost all jumps, bounds or ballistic swings. */
export const LIMITED_SKIPPED_SLOT = SessionSlot.SportSupport;
/** The slots of a heavy Limited Session; the skipped slot's exercise count goes to accessories-core. */
export const LIMITED_SLOTS: readonly SessionSlot[] = SLOT_ORDER.filter(
  (slot) => slot !== LIMITED_SKIPPED_SLOT,
);

/** The movement patterns a sport's key movements ask for; sport-support work prefers them. */
export const SPORT_MOVEMENT_PATTERNS: Readonly<Record<SportMovement, readonly MovementPattern[]>> =
  {
    [SportMovement.ChangeOfDirection]: [MovementPattern.ChangeOfDirection],
    [SportMovement.JumpLand]: [MovementPattern.JumpLand],
    [SportMovement.Rotation]: [MovementPattern.Rotation],
    [SportMovement.Overhead]: [MovementPattern.Overhead],
    [SportMovement.Grip]: [MovementPattern.Pull, MovementPattern.Carry],
    [SportMovement.Push]: [MovementPattern.Push],
    [SportMovement.Pull]: [MovementPattern.Pull],
    [SportMovement.Hinge]: [MovementPattern.Hinge],
    [SportMovement.Carry]: [MovementPattern.Carry],
    [SportMovement.BoardStance]: [MovementPattern.Core, MovementPattern.Lunge],
  };

/** SportPerformance Goal: explosive plus repeated-sprint share (percent) from which power and speed lead. */
export const POWER_SPEED_MIN_POWER_SHARE = 50;
export const STRENGTH_ENDURANCE_MIN_AEROBIC_SHARE = 60;

/** Recovery window used when a person's sport has no Sport Profile: hours after a hard Activity. */
export const DEFAULT_RECOVERY_WINDOW_HOURS = { lower: 48, upper: 24 } as const;
export const HOURS_PER_DAY = 24;
/** Days in the generated week. */
export const DAYS_IN_WEEK = 7;
/** Milliseconds in a day (UTC calendar days have no daylight-saving shift). */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Where the month sits in a `YYYY-MM-DD` date: characters 5 to 7. */
export const MONTH_START = 5;
export const MONTH_END = 7;
/** Sessions per week to the focus of each, in order; the Sessions of a week alternate lower and upper. */
export const FOCUS_SEQUENCE: readonly (SessionFocus.Lower | SessionFocus.Upper)[] = [
  SessionFocus.Lower,
  SessionFocus.Upper,
  SessionFocus.Lower,
  SessionFocus.Upper,
];
/** Days of the week in order, Monday first. */
export const WEEKDAY_ORDER: readonly Weekday[] = Object.values(Weekday);

/** Logging limits shared by the Session screen, the API and the database checks. */
export const MIN_SET_RPE = 6;
export const MAX_SET_RPE = 10;
export const MIN_SESSION_RPE = 1;
export const MAX_SESSION_RPE = 10;
/** Most sets one exercise can have logged (the plan has at most a handful; this allows extra sets). */
export const MAX_LOGGED_SETS = 20;
/** Reps, or seconds for a timed hold. */
export const MAX_LOGGED_REPS = 600;
export const MAX_WEIGHT_KG = 1000;
/** Longest Session minutes the person may report when finishing. */
export const MAX_SESSION_MINUTES = 300;

/**
 * The session RPE an Activity counts at, by how hard the person played. Activities are logged by
 * intensity, not RPE, so the server (not the client) holds the numbers.
 */
export const ACTIVITY_RPE_BY_INTENSITY: Readonly<Record<Intensity, number>> = {
  [Intensity.Easy]: 4,
  [Intensity.Moderate]: 6,
  [Intensity.Hard]: 8,
};
/** An Activity may be logged for a day this many days ahead of the server's UTC date (a device clock or time zone ahead). */
export const MAX_ACTIVITY_FUTURE_DAYS = 1;
/** A weigh-in may be dated at most this many days before the server's UTC date (a late entry; keeps years like 0000 out). */
export const MAX_WEIGH_IN_PAST_DAYS = 366;
/** How many weeks before this one the average Load covers. */
export const LOAD_AVERAGE_WEEKS = 4;

/**
 * The weekly verdict calls a week on track while its Load, with the planned Sessions and
 * Activities still to come, is within this share (10 percent) above or below the person's average.
 */
export const VOLUME_FLEX = 0.1;

/** A body weight the weigh-in accepts, in kilograms (a typo guard, not a health judgement). */
export const MIN_BODY_WEIGHT_KG = 30;
export const MAX_BODY_WEIGHT_KG = 300;

/** Movement patterns of the lower body; every other pattern counts as upper body for progression. */
export const LOWER_BODY_PATTERNS: readonly MovementPattern[] = [
  MovementPattern.Squat,
  MovementPattern.Hinge,
  MovementPattern.Lunge,
  MovementPattern.JumpLand,
  MovementPattern.ChangeOfDirection,
];
/** Kilograms added to the next Session's weight when every set hit the top of the range at or below the target effort. */
export const PROGRESSION_INCREMENT_KG: Readonly<Record<BodyHalf, number>> = {
  [BodyHalf.Upper]: 2.5,
  [BodyHalf.Lower]: 5,
};
/** The next Session's weight after a hard one: 5 % off. */
export const PROGRESSION_DECREASE_FACTOR = 0.95;
/** A set is hard when its RPE is at least this many points above the target RPE. */
export const PROGRESSION_HARD_RPE_MARGIN = 2;
/** This many hard sets in one Session take weight off the next. */
export const PROGRESSION_HARD_SETS = 2;
/** Suggested weights are rounded to the nearest multiple of this, in kilograms (the smallest plate step). */
export const WEIGHT_ROUNDING_KG = 0.5;
/** Effort of a set taken to failure; the target RPE is this minus the prescribed reps in reserve. */
export const FAILURE_RPE = 10;

/** Check-in answers (sleep, soreness, energy) run from this to `MAX_CHECKIN_SCORE`. */
export const MIN_CHECKIN_SCORE = 1;
export const MAX_CHECKIN_SCORE = 5;

/** The emergency number shown with a cardiac, fainting, breathing or heartbeat flag; every country Stamina serves (the EEA) has 112. */
export const EMERGENCY_NUMBER = '112';

/**
 * What each stop flag does (safety rules, "Stop flags"). `recheck` lists the Screening questions
 * the person answers again after reporting it; a fever has none. Safety-critical: changes need
 * the reviewers' sign-off.
 */
export const STOP_FLAG_EFFECTS: Readonly<Record<StopFlag, StopFlagEffect>> = {
  [StopFlag.ChestPain]: {
    action: StopAction.PauseUntilDoctor,
    showEmergency: true,
    recheck: [ScreeningQuestion.HeartCondition, ScreeningQuestion.ChestPain],
  },
  [StopFlag.Fainting]: {
    action: StopAction.PauseUntilDoctor,
    showEmergency: true,
    recheck: [ScreeningQuestion.Fainting],
  },
  [StopFlag.Breathlessness]: {
    action: StopAction.PauseUntilDoctor,
    showEmergency: true,
    recheck: [ScreeningQuestion.Breathing],
  },
  [StopFlag.Heartbeat]: {
    action: StopAction.PauseUntilDoctor,
    showEmergency: true,
    recheck: [ScreeningQuestion.HeartCondition],
  },
  [StopFlag.Fever]: { action: StopAction.RestToday, showEmergency: false, recheck: [] },
  [StopFlag.NewPain]: {
    action: StopAction.ExcludeArea,
    showEmergency: false,
    recheck: [ScreeningQuestion.BoneJointMuscle],
  },
  [StopFlag.HeadKnock]: {
    action: StopAction.PauseUntilCleared,
    showEmergency: false,
    recheck: [ScreeningQuestion.HeadInjury],
  },
};

/** The actions that pause training until the person confirms a doctor has seen or cleared them. */
export const PAUSING_STOP_ACTIONS: readonly StopAction[] = [
  StopAction.PauseUntilDoctor,
  StopAction.PauseUntilCleared,
];

/** A Check-in answer at or below this is low. */
export const POOR_CHECKIN_SCORE = 2;
/** A Check-in is poor when at least this many of its 3 answers are low. */
export const POOR_CHECKIN_ANSWERS = 2;
/** Soreness at or below this, with a Session that loads a targeted area, swaps those exercises. */
export const SORE_AREA_SORENESS = 2;
/** An Adaptation lightens a Session by this many reps in reserve (never past `MAX_RIR`) and this many sets (never below one). */
export const LIGHTER_RIR_STEP = 1;
export const LIGHTER_SETS_STEP = 1;
/** The days a Session may move to, tried in this order, relative to its own day. */
export const MOVE_SESSION_OFFSETS: readonly number[] = [1, -1];

/** Early Deload: Load above this multiple of the person's average ... */
export const DELOAD_LOAD_FACTOR = 1.3;
/** ... in each of this many weeks in a row (this week so far and the ones before it). */
export const DELOAD_LOAD_WEEKS = 2;
/** Early Deload: this many poor Check-ins ... */
export const DELOAD_POOR_CHECKINS = 3;
/** ... on different days within this many days, today included. */
export const DELOAD_POOR_CHECKIN_DAYS = 5;
/** Early Deload: this many finished Sessions in a row ... */
export const DELOAD_EFFORT_SESSIONS = 2;
/** ... each at least this many RPE points above its target. */
export const DELOAD_EFFORT_MARGIN = 2;
/** A declined Deload is asked again after this many days, only if its reason still holds. */
export const ADAPTATION_REASK_DAYS = 3;

/** This many unfinished Sessions dated before today, in the current week, repeat the week. */
export const MISSED_SESSIONS_TO_REPEAT = 2;
/** This many days without a finished Session (two weeks) restart the Block. */
export const DAYS_OFF_TO_RESTART = 14;
/** A restarted Block carries this many more reps in reserve (never past `MAX_RIR`). */
export const RESTART_RIR_STEP = 1;

/** Activities and Check-ins older than this many days no longer raise an Adaptation. */
export const ADAPTATION_LOOKBACK_DAYS = 14;

/** The rules that suggest an early Deload, in the order the first that holds wins. */
export const DELOAD_RULES: readonly AdaptationRule[] = [
  AdaptationRule.DeloadLoad,
  AdaptationRule.DeloadCheckins,
  AdaptationRule.DeloadEffort,
];

// --- Nutrition and hydration (ticket 16). General sports-nutrition guidance for healthy adults. ---

/** Weight change from the basis weight that resets the basis to the new weigh-in. */
export const RECALCULATE_AT_KG_CHANGE = 2;
export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 230;
export const MIN_MEALS_PER_DAY = 3;
export const MAX_MEALS_PER_DAY = 5;
export const MAX_DISLIKES = 10;
export const MAX_DISLIKE_LENGTH = 40;

/** Mifflin-St Jeor sex constants (kcal/day). `Unspecified` sits midway between the two. */
export const RESTING_SEX_CONSTANT: Record<EnergySex, number> = {
  [EnergySex.Male]: 5,
  [EnergySex.Female]: -161,
  [EnergySex.Unspecified]: -78,
};
/** Resting energy times this, by how active the day is outside training. */
export const EVERYDAY_ACTIVITY_FACTOR: Record<EverydayActivity, number> = {
  [EverydayActivity.Sitting]: 1.4,
  [EverydayActivity.OnFeet]: 1.5,
  [EverydayActivity.Physical]: 1.7,
};
/**
 * MET of every Session. Sessions carry no intensity, so one constant.
 * [INFERENCE] value for dietitian review.
 */
export const SESSION_MET = 5.0;
/**
 * METs by intensity for a sport with no Sport Profile (an unapproved Other sport).
 * [INFERENCE] values for dietitian review.
 */
export const FALLBACK_METS_PER_INTENSITY: Record<Intensity, number> = {
  [Intensity.Easy]: 3,
  [Intensity.Moderate]: 5,
  [Intensity.Hard]: 7,
};
/** Minutes in an hour, for MET-hour sums. */
export const MINUTES_IN_HOUR = 60;

/** Carbohydrate grams per kg of body weight by day type (hard day: midpoint of 6-7). */
export const CARBS_G_PER_KG: Record<DayType, number> = {
  [DayType.Rest]: 3,
  [DayType.Session]: 4,
  [DayType.Activity]: 5,
  [DayType.HardActivity]: 6.5,
};
export const PROTEIN_G_PER_KG = 1.6;
export const PROTEIN_G_PER_KG_LOSING_FAT = 2.0;
/** Fat is at least this share of energy ... */
export const FAT_MIN_ENERGY_SHARE = 0.2;
/** ... and fills the remainder up to this share. */
export const FAT_MAX_ENERGY_SHARE = 0.35;
export const KCAL_PER_G_PROTEIN = 4;
export const KCAL_PER_G_CARBS = 4;
export const KCAL_PER_G_FAT = 9;
/** Energy deficit of a fat-loss Goal (never on a HardActivity day) and its halved form. */
export const FAT_LOSS_DEFICIT_KCAL = 400;
export const FAT_LOSS_DEFICIT_HALVED_KCAL = 200;
export const MUSCLE_GAIN_SURPLUS_KCAL = 250;

/** Rate check: a weekly weight loss above this percent of the earlier week is too fast. */
export const RATE_CHECK_LOSS_PCT = 1;
/** Rate check: an interval between two weigh-ins shorter than this many days is ignored. */
export const RATE_CHECK_MIN_INTERVAL_DAYS = 3;
/** Rate check: an interval between two weigh-ins longer than this many days is ignored. */
export const RATE_CHECK_MAX_INTERVAL_DAYS = 14;
/**
 * Rate check: this many too-fast intervals in a row halve the deficit.
 * [INFERENCE] on the 'twice' wording of the source rule; for dietitian review.
 */
export const RATE_CHECK_INTERVALS_TO_HALVE = 2;
/**
 * Rate check: the check firing at two consecutive weekly evaluations, i.e. this many too-fast
 * intervals in a row, prompts talking to a dietitian or doctor.
 * [INFERENCE] on the 'twice' wording of the source rule; for dietitian review.
 */
export const RATE_CHECK_INTERVALS_TO_PROMPT = 3;

/** Daily drinks base by sex (ml). */
export const DRINKS_BASE_ML: Record<EnergySex, number> = {
  [EnergySex.Male]: 2000,
  [EnergySex.Female]: 1600,
  [EnergySex.Unspecified]: 1800,
};
export const DRINKS_ML_PER_TRAINING_HOUR = 500;
export const DRINKS_ML_PER_HOT_TRAINING_HOUR = 250;
/** The exercise addition never exceeds this per training hour. */
export const DRINKS_MAX_EXERCISE_ML_PER_HOUR = 1000;
/** Drinks before an Activity, per kg of body weight (2-4 hours before). */
export const PRE_ACTIVITY_ML_PER_KG = { min: 5, max: 10 } as const;
/** An Activity longer than this many minutes adds the electrolyte note. */
export const ELECTROLYTE_NOTE_MINUTES = 120;
/** An Activity longer than this many minutes adds carbohydrate for during it. */
export const DURING_CARBS_MINUTES = 90;
export const DURING_CARBS_G_PER_HOUR = { min: 30, max: 60 } as const;

/** Meal times by meals per day, as minutes of the day. A slot appears with its time. */
export const MEAL_TIMES: Record<number, readonly { slot: MealSlot; at: number }[]> = {
  3: [
    { slot: MealSlot.Breakfast, at: 8 * 60 },
    { slot: MealSlot.Lunch, at: 13 * 60 },
    { slot: MealSlot.Dinner, at: 19 * 60 + 30 },
  ],
  4: [
    { slot: MealSlot.Breakfast, at: 8 * 60 },
    { slot: MealSlot.Lunch, at: 13 * 60 },
    { slot: MealSlot.Snack, at: 16 * 60 + 30 },
    { slot: MealSlot.Dinner, at: 19 * 60 + 30 },
  ],
  5: [
    { slot: MealSlot.Breakfast, at: 8 * 60 },
    { slot: MealSlot.Snack, at: 10 * 60 + 30 },
    { slot: MealSlot.Lunch, at: 13 * 60 },
    { slot: MealSlot.Snack, at: 16 * 60 + 30 },
    { slot: MealSlot.Dinner, at: 19 * 60 + 30 },
  ],
};
