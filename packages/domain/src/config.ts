import { ConsentPurpose } from './enums/consent-purpose.ts';
import { Equipment } from './enums/equipment.ts';
import { LaunchSport } from './enums/launch-sport.ts';
import { ScreeningQuestion } from './enums/screening-question.ts';

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
