// The single place that ties the issue forms in .github/ISSUE_TEMPLATE/ to the
// data files under data/. Each entry names a form field (its id and label,
// exactly as written in the template), the data-file key it feeds, the kind of
// value it holds and the checks that apply. scripts/intake.mjs reads
// submissions with this mapping and scripts/test-intake.mjs verifies that the
// templates still agree with it.
//
// Nothing here imports from src/: this file runs under plain Node in the
// intake workflow, without the Astro toolchain. The vocabularies below
// therefore duplicate src/lib/taxonomy.ts, which remains the source of truth.
// When taxonomy.ts changes, change these lists and the dropdowns in the
// templates together.

/** Cities of the Greater Bay Area. Member labs must be in one of these. */
export const GBA_CITIES = Object.freeze([
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
]);

export const TIERS = Object.freeze(['member', 'affiliate']);
export const EVENT_TYPES = Object.freeze(['seminar', 'workshop', 'summer-school', 'hackathon', 'journal-club', 'other']);
export const TUTORIAL_FORMATS = Object.freeze(['notebook', 'slides', 'video', 'course', 'book', 'software', 'dataset', 'other']);
export const LEVELS = Object.freeze(['introductory', 'intermediate', 'advanced']);
export const MATERIAL_LANGUAGES = Object.freeze(['English', 'Chinese', 'Bilingual', 'Other']);
export const POSITION_TYPES = Object.freeze(['phd', 'postdoc', 'research-assistant', 'faculty', 'internship', 'other']);

/** All events are in Hong Kong Time; the joined/added/posted dates use it too. */
export const TIME_ZONE = 'Asia/Hong_Kong';

/** The extra option at the end of the lab form's city dropdown. */
export const OTHER_CITY = 'Other (affiliate lab, outside the Greater Bay Area)';

/** Options of the event form's platform dropdown. */
export const IN_PERSON_ONLY = 'In person only';
export const PLATFORMS = Object.freeze(['Zoom', 'Tencent Meeting (VooV)', 'Other', IN_PERSON_ONLY]);

const SITE = 'https://xbtinchina.github.io/Greater-bay-CCN-association';

export const CONSENT_PUBLISH =
  'I consent to the publication of the name, photo and affiliation given here on the network website and in this public repository under the CC BY 4.0 licence';
export const CONSENT_PRIVACY = `I have read the [privacy and consent statement](${SITE}/docs/privacy-and-consent/)`;

/**
 * Field kinds understood by scripts/intake.mjs:
 *   text        one line; whitespace collapsed
 *   sentence    like text, with a maximum length (max)
 *   markdown    free text kept verbatim (an abstract, a position description)
 *   url         a full https:// address
 *   email       an email address
 *   date        YYYY-MM-DD
 *   time        HH:MM, 24-hour, Hong Kong Time
 *   list        comma-separated values, becomes a YAML list (min, max)
 *   enum        a dropdown; value must be one of options (default when empty)
 *   checkboxes  a checkbox group; options carry {label, required}
 *   image       an attachment field; the first image in it is downloaded
 *   id          a lab id: the file name in data/labs without .yml
 *   doi         a DOI; a https://doi.org/ prefix is removed
 *
 * `key` is the data-file key the value goes to, or null when the intake
 * script consumes the field in some other way (consent, photo, the abstract
 * that becomes the Markdown body, the junior speaker sub-object).
 */
function f(id, label, key, kind, extra = {}) {
  return Object.freeze({ id, label, key, kind, required: false, ...extra });
}

export const FORMS = Object.freeze({
  lab: {
    type: 'lab',
    template: 'lab.yml',
    label: 'intake:lab',
    prefix: '[Lab]',
    fields: [
      f('pi', 'PI name (Latin script)', 'pi', 'text', { required: true }),
      f('pi_native', 'PI name (native script)', 'pi_native', 'text'),
      f('lab', 'Lab name', 'lab', 'text'),
      f('institution', 'Institution', 'institution', 'text', { required: true }),
      f('institution_short', 'Institution, short form', 'institution_short', 'text'),
      f('department', 'Department', 'department', 'text'),
      f('city', 'City', 'city', 'enum', { required: true, options: [...GBA_CITIES, OTHER_CITY] }),
      f('city_other', 'If Other, which city?', null, 'text'),
      f('tier', 'Tier', 'tier', 'enum', { required: true, options: TIERS }),
      f('website', 'Lab website', 'website', 'url'),
      f('email', 'Contact email (public if given)', 'email', 'email'),
      f('scholar', 'Google Scholar profile', 'scholar', 'url'),
      f('github', 'GitHub organisation or profile', 'github', 'url'),
      f('keywords', 'Research keywords (1 to 8, comma-separated)', 'keywords', 'list', { required: true, min: 1, max: 8 }),
      f('description', 'Description (one or two sentences, max 700 characters)', 'description', 'sentence', { required: true, max: 700 }),
      f('looking_for', 'Looking for', 'looking_for', 'sentence', { max: 300 }),
      f('photo', 'PI photo', null, 'image'),
      f('consent', 'Consent', null, 'checkboxes', {
        options: [
          { label: CONSENT_PUBLISH, required: true },
          { label: CONSENT_PRIVACY, required: true },
        ],
      }),
    ],
  },

  event: {
    type: 'event',
    template: 'event.yml',
    label: 'intake:event',
    prefix: '[Event]',
    fields: [
      f('title', 'Event title', 'title', 'text', { required: true }),
      f('type', 'Event type', 'type', 'enum', { options: EVENT_TYPES, default: 'seminar' }),
      f('date', 'Date (YYYY-MM-DD)', 'date', 'date', { required: true }),
      f('end_date', 'End date (YYYY-MM-DD, multi-day events only)', 'end_date', 'date'),
      f('start', 'Start time (HH:MM, Hong Kong Time)', 'start', 'time'),
      f('end', 'End time (HH:MM, Hong Kong Time)', 'end', 'time'),
      f('speaker', 'Speaker (Latin script)', 'speaker', 'text'),
      f('speaker_native', 'Speaker (native script)', 'speaker_native', 'text'),
      f('speaker_affiliation', 'Speaker affiliation', 'speaker_affiliation', 'text'),
      f('speaker_url', 'Speaker web page', 'speaker_url', 'url'),
      f('junior_name', 'Junior speaker name', null, 'text'),
      f('junior_affiliation', 'Junior speaker affiliation', null, 'text'),
      f('junior_title', 'Junior talk title', null, 'text'),
      f('host_lab', 'Host lab id', 'host_lab', 'id'),
      f('host_institution', 'Host institution', 'host_institution', 'text'),
      f('location', 'Location', 'location', 'text', { default: 'Online' }),
      f('platform', 'Platform', 'platform', 'enum', { options: PLATFORMS }),
      f('registration_url', 'Registration link', 'registration_url', 'url'),
      f('abstract', 'Abstract (Markdown)', null, 'markdown', { required: true }),
      f('consent', 'Consent', null, 'checkboxes', {
        options: [
          { label: 'The speaker has agreed to be listed publicly', required: true },
          { label: 'Written recording consent has been obtained', required: false },
        ],
      }),
    ],
  },

  tutorial: {
    type: 'tutorial',
    template: 'tutorial.yml',
    label: 'intake:tutorial',
    prefix: '[Tutorial]',
    fields: [
      f('title', 'Title', 'title', 'text', { required: true }),
      f('authors', 'Authors (comma-separated)', 'authors', 'list', { required: true, min: 1, max: 40 }),
      f('lab', 'Lab id', 'lab', 'id'),
      f('format', 'Format', 'format', 'enum', { options: TUTORIAL_FORMATS, default: 'other' }),
      f('level', 'Level', 'level', 'enum', { options: LEVELS, default: 'introductory' }),
      f('language', 'Language', 'language', 'enum', { options: MATERIAL_LANGUAGES, default: 'English' }),
      f('url', 'Link to the material', 'url', 'url', { required: true }),
      f('doi', 'DOI', 'doi', 'doi'),
      f('topics', 'Topics (1 to 8, comma-separated)', 'topics', 'list', { required: true, min: 1, max: 8 }),
      f('description', 'Description (max 700 characters)', 'description', 'sentence', { max: 700 }),
      f('consent', 'Confirmation', null, 'checkboxes', {
        options: [
          {
            label: "The material is openly accessible at the link and I am an author or have the authors' permission",
            required: true,
          },
        ],
      }),
    ],
  },

  position: {
    type: 'position',
    template: 'position.yml',
    label: 'intake:position',
    prefix: '[Position]',
    fields: [
      f('title', 'Position title', 'title', 'text', { required: true }),
      f('type', 'Position type', 'type', 'enum', { options: POSITION_TYPES, default: 'other' }),
      f('lab', 'Lab id', 'lab', 'id'),
      f('pi', 'PI', 'pi', 'text'),
      f('institution', 'Institution', 'institution', 'text', { required: true }),
      f('city', 'City', 'city', 'text', { required: true }),
      f('url', 'Link to the full advertisement', 'url', 'url'),
      f('contact_email', 'Contact email', 'contact_email', 'email'),
      f('deadline', 'Application deadline (YYYY-MM-DD)', 'deadline', 'date'),
      f('expires', 'Remove the listing after (YYYY-MM-DD)', 'expires', 'date'),
      f('body', 'Description (Markdown)', null, 'markdown', { required: true }),
    ],
  },

  // Nominations are read by coordinators only. Listed here so that type
  // detection and the template check know about the form; no data file is
  // ever created from it.
  nomination: {
    type: 'nomination',
    template: 'speaker-nomination.yml',
    label: 'speaker-nomination',
    prefix: '[Speaker]',
    fields: [
      f('name', 'Nominee', null, 'text', { required: true }),
      f('affiliation', 'Affiliation', null, 'text', { required: true }),
      f('url', 'Web page', null, 'url'),
      f('why', 'Why this speaker (one line)', null, 'text', { required: true }),
      f('suggested_host', 'Suggested host lab', null, 'text'),
      f('willing_to_host', 'Hosting', null, 'checkboxes', {
        options: [{ label: 'I am willing to host this talk', required: false }],
      }),
      f('note', 'Anything else', null, 'markdown'),
    ],
  },
});

/** The types that produce a data file, in the order they are checked. */
export const DATA_TYPES = Object.freeze(['lab', 'event', 'tutorial', 'position']);

/**
 * Decide the submission type from the issue's labels, falling back to the
 * title prefix. Returns 'lab' | 'event' | 'tutorial' | 'position' |
 * 'nomination' | null.
 */
export function detectType(labelNames, title) {
  const labels = new Set(labelNames ?? []);
  for (const type of DATA_TYPES) if (labels.has(FORMS[type].label)) return type;
  if (labels.has(FORMS.nomination.label)) return 'nomination';
  const lower = String(title ?? '')
    .trimStart()
    .toLowerCase();
  for (const type of Object.keys(FORMS)) {
    if (lower.startsWith(FORMS[type].prefix.toLowerCase())) return type;
  }
  return null;
}
