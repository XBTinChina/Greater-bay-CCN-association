// Controlled vocabularies shared by the content schemas, the pages and the
// intake script. Change them here and everything else follows.

/** Cities of the Guangdong–Hong Kong–Macao Greater Bay Area. Member labs must be in one of these. */
export const GBA_CITIES = [
  'Hong Kong',
  'Shenzhen',
  'Guangzhou',
  'Macau',
  'Zhuhai',
  'Foshan',
  'Dongguan',
  'Huizhou',
  'Zhongshan',
  'Jiangmen',
  'Zhaoqing',
] as const;
export type GbaCity = (typeof GBA_CITIES)[number];

export const TIERS = ['member', 'affiliate'] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_LABELS: Record<Tier, string> = {
  member: 'Member lab',
  affiliate: 'Affiliate lab',
};

export const EVENT_TYPES = [
  'seminar',
  'workshop',
  'summer-school',
  'hackathon',
  'journal-club',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  seminar: 'Seminar',
  workshop: 'Workshop',
  'summer-school': 'Summer school',
  hackathon: 'Hackathon',
  'journal-club': 'Journal club',
  other: 'Event',
};

export const TUTORIAL_FORMATS = [
  'notebook',
  'slides',
  'video',
  'course',
  'book',
  'software',
  'dataset',
  'other',
] as const;
export type TutorialFormat = (typeof TUTORIAL_FORMATS)[number];

export const LEVELS = ['introductory', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVELS)[number];

export const MATERIAL_LANGUAGES = ['English', 'Chinese', 'Bilingual', 'Other'] as const;

export const POSITION_TYPES = [
  'phd',
  'postdoc',
  'research-assistant',
  'faculty',
  'internship',
  'other',
] as const;
export type PositionType = (typeof POSITION_TYPES)[number];
export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  phd: 'PhD',
  postdoc: 'Postdoc',
  'research-assistant': 'Research assistant',
  faculty: 'Faculty',
  internship: 'Internship',
  other: 'Other',
};

/** Fixed time zone for all events. Hong Kong and mainland China share UTC+8 with no daylight saving. */
export const TIME_ZONE = 'Asia/Hong_Kong';
export const UTC_OFFSET = '+08:00';
