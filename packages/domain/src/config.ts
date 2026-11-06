import { BodyHalf } from './enums/body-half.ts';
import { ConsentPurpose } from './enums/consent-purpose.ts';
import { Emphasis } from './enums/emphasis.ts';
import { Equipment } from './enums/equipment.ts';
import { LaunchSport } from './enums/launch-sport.ts';
import { MovementPattern } from './enums/movement-pattern.ts';
import { ScreeningQuestion } from './enums/screening-question.ts';
import { SessionFocus } from './enums/session-focus.ts';
import { SessionSlot } from './enums/session-slot.ts';
import { SportMovement } from './enums/sport-movement.ts';
import { Weekday } from './enums/weekday.ts';

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
