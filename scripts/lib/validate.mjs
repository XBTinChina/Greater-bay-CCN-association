// The validation core shared by the intake script and the web-form worker.
//
// Everything here is pure and portable: no node: imports, no file system, no
// yaml, no sharp. It runs unchanged under Node (scripts/intake.mjs), in a
// worker runtime and in the browser, so a submission is judged by exactly the
// same rules wherever it arrives from.
//
// Two entry points read a whole form, both against the field descriptors in
// scripts/lib/forms.mjs and both collecting their complaints into a `problems`
// array the caller owns:
//
//   readFields(form, body, problems)    a GitHub issue-form Markdown body
//   readValues(form, values, problems)  an already-structured {fieldId: value}
//
// They share one per-kind ladder, so the two paths cannot drift apart. The
// values they return are keyed by field id; an empty optional field is
// undefined, a list is an array of strings and a checkbox group is an array of
// booleans, one per declared option in order.
//
// Rules that span several fields (a member lab must be in the Greater Bay
// Area, an end time must follow a start time, a deadline must not be past)
// live here too, in crossChecks, because both doors have to apply them: the
// worker cannot file an issue the intake would then refuse, since a web
// submitter has no account and cannot edit that issue afterwards.

import { GBA_CITIES, OTHER_CITY, TIME_ZONE } from './forms.mjs';
import { parseCheckboxes, parseIssueForm } from './issue-form.mjs';

// ------------------------------------------------------------- constants

export const SLUG_MAX = 60;
export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// The same rule as z.string().email() in the site schema, so a bad address is
// caught here with a clear message rather than in the build log.
export const EMAIL_RE = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
export const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
export const DOI_RE = /^10\.\d{4,9}\/\S+$/i;
// Meeting links and passcodes must never reach a public data file.
export const MEETING_LINK_RE =
  /(zoom\.(?:us|com)\/(?:j|my|s|w)\/|voovmeeting\.com\/|meeting\.tencent\.com\/|teams\.microsoft\.com\/l\/meetup|meet\.google\.com\/[a-z]{3}-|webex\.com\/meet\/|\bpasscode\s*[:：])/i;

// Letters that NFKD does not decompose to ASCII.
const SPECIAL_LETTERS = { ł: 'l', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', đ: 'd', þ: 'th', ð: 'd', ı: 'i', ŧ: 't', ħ: 'h' };

// --------------------------------------------------------------- helpers

export const collapse = (text) => String(text).replace(/\s+/g, ' ').trim();

/** A label with its Markdown links reduced to their text, for messages. */
export function plainLabel(label) {
  return String(label).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[łøæœßđþðıŧħ]/g, (ch) => SPECIAL_LETTERS[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncateSlug(slug, max = SLUG_MAX) {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  return cut.includes('-') ? cut.replace(/-[^-]*$/, '') : cut;
}

export function asciiLetters(text) {
  return (String(text).match(/[a-z]/gi) ?? []).length;
}

// http:// is accepted because many mainland lab and department pages still
// have no TLS, and the site schema accepts any URL with a scheme.
export function isWebUrl(text) {
  try {
    const u = new URL(text);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function normaliseDate(text) {
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(String(text).trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function normaliseTime(text) {
  const cleaned = String(text)
    .replace(/\s*(hkt|hong kong time|\(hkt\))\s*$/i, '')
    .replace(/[：.]/g, ':')
    .trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(cleaned);
  if (!m) return null;
  const value = `${m[1].padStart(2, '0')}:${m[2]}`;
  return TIME_RE.test(value) ? value : null;
}

/** A bare iD or an orcid.org address, normalised to the full https address. */
export function normaliseOrcid(text, problems) {
  if (!text) return undefined;
  const id = String(text)
    .trim()
    .replace(/^https?:\/\/(?:www\.)?orcid\.org\//i, '')
    .replace(/\/+$/, '')
    .toUpperCase();
  if (!ORCID_RE.test(id)) {
    problems.push(`"ORCID iD" must look like 0000-0002-1825-0097 (got "${text}").`);
    return undefined;
  }
  return `https://orcid.org/${id}`;
}

export function splitList(text) {
  const seen = new Set();
  const items = [];
  for (const raw of String(text).split(/[,，、;；\n]+/)) {
    const item = collapse(raw);
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    items.push(item);
  }
  return items;
}

/** The calendar date of an ISO timestamp in Hong Kong Time, as YYYY-MM-DD. */
export function dateInHongKong(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error(`The payload has no valid issue.created_at (got ${JSON.stringify(iso)}).`);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function checkNoMeetingLinks(texts, problems) {
  if (texts.some((t) => t && MEETING_LINK_RE.test(t))) {
    problems.push('The text contains a meeting link or passcode. Remove it: meeting details go to the announcement list, never into a public file.');
  }
}

// -------------------------------------------------------- the field ladder

/** Checkbox labels are compared on their visible text, ignoring case and runs of space. */
const normOption = (label) => collapse(plainLabel(label)).toLowerCase();

/**
 * The booleans of a checkbox group, given the labels the submitter ticked.
 * Matching is by label, not by position: the author can edit a generated issue
 * body, and two arbitrary ticked lines must not count as the consent
 * statements.
 */
function checkedFlags(field, tickedLabels, problems) {
  const label = plainLabel(field.label);
  const ticked = new Set(Array.from(tickedLabels, normOption));
  for (const option of field.options) {
    if (option.required && !ticked.has(normOption(option.label))) {
      problems.push(`Tick the box "${plainLabel(option.label)}" under "${label}".`);
    }
  }
  return field.options.map((option) => ticked.has(normOption(option.label)));
}

/** Every kind except checkboxes, from one raw string. */
function scalarValue(field, raw, problems) {
  const label = plainLabel(field.label);
  const text = String(raw).trim();
  if (!text) {
    if (field.default !== undefined) return field.default;
    if (field.required) problems.push(`"${label}" is required.`);
    return undefined;
  }
  switch (field.kind) {
    case 'text':
      return collapse(text);
    case 'sentence': {
      const value = collapse(text);
      if (field.max && value.length > field.max) problems.push(`"${label}" is ${value.length} characters long; the maximum is ${field.max}.`);
      return value;
    }
    case 'markdown':
    case 'image':
      return text;
    case 'url': {
      // Collapse first: the URL parser silently drops tabs and newlines, so an
      // address carrying one would pass the check and then reach the issue body
      // still holding a line break.
      const value = collapse(text);
      if (!isWebUrl(value)) problems.push(`"${label}" must be a full web address starting with https:// or http:// (got "${text}").`);
      return value;
    }
    case 'orcid':
      // Validated in the ladder, so both the web form and the GitHub form
      // refuse a malformed iD at the door rather than after the issue is filed.
      return normaliseOrcid(text, problems);
    case 'email': {
      const value = text.replace(/^mailto:/i, '').replace(/\s+/g, '');
      if (!EMAIL_RE.test(value)) problems.push(`"${label}" does not look like an email address (got "${text}").`);
      return value;
    }
    case 'date': {
      const value = normaliseDate(text);
      if (!value) problems.push(`"${label}" must be a real date written YYYY-MM-DD (got "${text}").`);
      // undefined, not the raw text: the problem is recorded, and returning the
      // text would trigger spurious "end before start" comparisons downstream.
      return value ?? undefined;
    }
    case 'time': {
      const value = normaliseTime(text);
      if (!value) problems.push(`"${label}" must be a 24-hour time written HH:MM, for example 16:00 (got "${text}").`);
      return value ?? undefined;
    }
    case 'list': {
      const items = splitList(text);
      const min = field.min ?? 1;
      const max = field.max ?? Infinity;
      if (items.length < min || items.length > max) {
        problems.push(`"${label}" needs between ${min} and ${max} entries separated by commas; it has ${items.length}.`);
      }
      return items;
    }
    case 'enum':
      if (!field.options.includes(text)) problems.push(`"${label}" must be one of: ${field.options.join(', ')} (got "${text}").`);
      return text;
    case 'id': {
      const value = text.toLowerCase().replace(/\.ya?ml$/, '');
      if (!ID_RE.test(value)) {
        problems.push(`"${label}" must be a lab id, the file name in data/labs without .yml: lowercase letters, digits and hyphens (got "${text}").`);
      }
      return value;
    }
    case 'doi': {
      const value = text.replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '');
      if (!DOI_RE.test(value)) problems.push(`"${label}" does not look like a DOI; expected something like 10.5281/zenodo.0000000 (got "${text}").`);
      return value;
    }
    default:
      throw new Error(`Unknown field kind "${field.kind}" for "${field.id}".`);
  }
}

/** One field of a GitHub issue-form body: checkbox lines, or a raw string. */
export function normalise(field, raw, problems) {
  if (field.kind === 'checkboxes') {
    const ticked = parseCheckboxes(raw)
      .filter((b) => b.checked)
      .map((b) => b.label);
    return checkedFlags(field, ticked, problems);
  }
  return scalarValue(field, raw, problems);
}

/**
 * One field of a structured payload: an array of the ticked option labels for
 * a checkbox group, a plain string for everything else. Anything else is a
 * malformed payload and is reported as such rather than coerced.
 */
export function normaliseValue(field, value, problems) {
  const label = plainLabel(field.label);
  if (field.kind === 'checkboxes') {
    if (value === undefined || value === null || value === '') return checkedFlags(field, [], problems);
    const ticked = Array.isArray(value) ? value : [value];
    if (ticked.some((item) => typeof item !== 'string')) {
      problems.push(`"${label}" must be a list of the boxes that were ticked.`);
      return field.options.map(() => false);
    }
    return checkedFlags(field, ticked, problems);
  }
  if (value === undefined || value === null) return scalarValue(field, '', problems);
  if (typeof value !== 'string') {
    problems.push(`"${label}" must be a single line of text.`);
    return undefined;
  }
  return scalarValue(field, value, problems);
}

// ---------------------------------------------------------- reading a form

/**
 * Read a submission from the Markdown body GitHub generates for an issue form.
 * @returns {Record<string, unknown>} values keyed by field id.
 */
export function readFields(form, body, problems) {
  const parsed = parseIssueForm(body, form.fields.map((f) => f.label));
  const values = {};
  for (const field of form.fields) values[field.id] = normalise(field, parsed.get(field.label) ?? '', problems);
  return values;
}

/**
 * Read a submission from an already-structured object, as the web form posts
 * it: {fieldId: string | string[]}. Same rules, same messages and the same
 * result as readFields on the body rendered from those values, so a submission
 * cannot pass one door and fail the other. Unknown keys are ignored.
 * @returns {Record<string, unknown>} values keyed by field id.
 */
export function readValues(form, values, problems) {
  const input = values && typeof values === 'object' ? values : {};
  const out = {};
  for (const field of form.fields) out[field.id] = normaliseValue(field, input[field.id], problems);
  return out;
}

// ------------------------------------------------------ rules across fields

/**
 * Every rule that compares two fields, for one submission type. Run it on the
 * value object readFields or readValues returns, right after that call: the
 * builders in scripts/intake.mjs call it, and so does the web-form worker, so
 * a submission that would fail the intake is refused at the door instead of
 * becoming a public issue nobody can edit.
 *
 * Pure and portable like the rest of this file. `today` is the caller's idea
 * of the current date in Hong Kong (YYYY-MM-DD, from dateInHongKong): no clock
 * is read in here, so the past-deadline rule can be tested with a fixed day.
 * It is only needed for positions, and its absence there is a caller bug, not
 * a submission problem, so it throws rather than passing the deadline.
 *
 * A type with no cross-field rule (a nomination) is a no-op.
 */
export function crossChecks(type, v, problems, today) {
  if (type === 'lab') {
    const city = v.city === OTHER_CITY ? v.city_other : v.city;
    if (v.city === OTHER_CITY && !v.city_other) problems.push('You chose "Other" as the city; fill in "If Other, which city?".');
    if (v.tier === 'member' && city && !GBA_CITIES.includes(city)) {
      problems.push(
        `Member labs must be in a Greater Bay Area city (${GBA_CITIES.join(', ')}); "${city}" is not one. Choose the city from the list, or choose the tier "affiliate".`,
      );
    }
    checkNoMeetingLinks([v.lab, v.department, v.institution, v.description, v.looking_for], problems);
  } else if (type === 'event') {
    if (v.end_date && v.date && v.end_date < v.date) problems.push('The end date is before the date.');
    if (v.end && !v.start) problems.push('An end time was given without a start time.');
    const singleDay = !v.end_date || v.end_date === v.date;
    if (v.start && v.end && singleDay && v.end <= v.start) problems.push('The end time must be after the start time.');
    if (!v.junior_name && (v.junior_affiliation || v.junior_title)) {
      problems.push('A junior speaker affiliation or talk title was given without the junior speaker name.');
    }
    // Every event field that reaches the public file, not only the obvious ones:
    // a passcode pasted after a speaker's name is just as published.
    checkNoMeetingLinks(
      [
        v.title,
        v.abstract,
        v.location,
        v.host_institution,
        v.speaker,
        v.speaker_native,
        v.speaker_affiliation,
        v.speaker_url,
        v.registration_url,
        v.junior_name,
        v.junior_affiliation,
        v.junior_title,
      ],
      problems,
    );
  } else if (type === 'tutorial') {
    checkNoMeetingLinks([v.title, v.description, v.url], problems);
  } else if (type === 'position') {
    if (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      throw new Error(`crossChecks("position", …) needs today as YYYY-MM-DD in Hong Kong Time (got ${JSON.stringify(today)}).`);
    }
    if (v.deadline && v.deadline < today) problems.push(`The application deadline (${v.deadline}) is already past.`);
    if (v.expires && v.deadline && v.expires < v.deadline) problems.push('The removal date is before the application deadline.');
    checkNoMeetingLinks([v.title, v.body, v.url], problems);
  }
}
