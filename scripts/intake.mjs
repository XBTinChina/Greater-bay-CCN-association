#!/usr/bin/env node
// Intake: turn a submitted issue form into a data file.
//
// Reads the GitHub event payload (GITHUB_EVENT_PATH, or --event <file> for
// local runs), works out the submission type from the issue's intake:* label
// or its title prefix, parses the form body with the mapping in
// scripts/lib/forms.mjs, validates every field with scripts/lib/validate.mjs,
// downloads and resizes the photo for labs, and writes:
//
//   labs       data/labs/<slug>.yml          + public/photos/<slug>.webp
//   events     data/events/<date>-<slug>.md   (frontmatter + abstract)
//   tutorials  data/tutorials/<slug>.yml
//   positions  data/positions/<slug>.md       (frontmatter + description)
//
// Nothing but the payload file is read from outside; no untrusted text ever
// comes in through the command line. On any problem the script exits 1 with
// a plain message the submitter can act on. On success it prints a JSON
// summary and, when GITHUB_OUTPUT is set, appends files=, slug=, type= and
// title= for the workflow.
//
// Environment:
//   INTAKE_ROOT              write under this directory instead of the repo
//                            root (tests use .intake/…); paths in the summary
//                            stay relative to it
//   INTAKE_ALLOW_FILE_URLS   "1" lets the photo come from a file:// URL
//                            (tests only)
//   GITHUB_TOKEN             used for a second photo download attempt when
//                            the first one is refused

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Document, Pair, Scalar, visit } from 'yaml';
import sharp from 'sharp';
import { FORMS, IN_PERSON_ONLY, OTHER_CITY, detectType } from './lib/forms.mjs';
import {
  asciiLetters,
  crossChecks,
  dateInHongKong,
  readFields,
  slugify,
  truncateSlug,
} from './lib/validate.mjs';

// The field rules and the rules across fields live in lib/validate.mjs so that
// the web-form worker can run them too; these two are re-exported because
// other scripts import them here.
export { dateInHongKong, slugify };

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_SIZE = 400;
// Strings that js-yaml (used by Astro to read the files) would turn into Date
// objects unless quoted. Real date fields are written unquoted on purpose.
const DATE_KEYS = new Set(['date', 'end_date', 'joined', 'added', 'posted', 'deadline', 'expires']);
const DATE_LIKE_RE = /^\d{4}-\d{1,2}-\d{1,2}(?:$|[Tt ])/;
const IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'tiff', 'avif', 'heif']);

/** A problem the submitter can fix by editing the issue. */
export class SubmissionError extends Error {
  constructor(problems) {
    const list = Array.isArray(problems) ? problems : [problems];
    super(`This submission cannot be published yet:\n${list.map((p) => `- ${p}`).join('\n')}`);
    this.name = 'SubmissionError';
    this.problems = list;
  }
}

// ---------------------------------------------------------------- helpers

/** First candidate whose slug has at least two Latin letters; warns when it is not the first. */
function pickSlug(candidates, fallback, warnings) {
  for (let i = 0; i < candidates.length; i += 1) {
    const [text, what] = candidates[i];
    const slug = truncateSlug(slugify(text));
    if (asciiLetters(slug) >= 2) {
      if (i > 0) {
        warnings.push(
          `${candidates[0][1]} has no Latin letters, so the file is named after ${what} ("${slug}"). Rename the file (and the photo) in the pull request if a better name exists.`,
        );
      }
      return slug;
    }
  }
  warnings.push(`No field yields a usable file name; using "${fallback}". Rename the file in the pull request.`);
  return fallback;
}

/** Remove empty values so optional fields are simply absent from the file. */
function clean(value) {
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const c = clean(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}

/**
 * Serialise with the yaml package. `quoted` keys are always written as
 * double-quoted strings (times such as "16:00"); long `folded` strings are
 * written as >- blocks like the example files.
 */
export function toYaml(data, { quoted = [], folded = [], comment } = {}) {
  const doc = new Document(clean(data) ?? {});
  if (comment) doc.commentBefore = ` ${comment}`;
  for (const key of quoted) {
    const node = doc.get(key, true);
    if (node instanceof Scalar) node.type = Scalar.QUOTE_DOUBLE;
  }
  for (const key of folded) {
    const node = doc.get(key, true);
    if (node instanceof Scalar && typeof node.value === 'string' && node.value.length > 72) node.type = Scalar.BLOCK_FOLDED;
  }
  // The yaml package (YAML 1.2) leaves "2026-10-29" plain; js-yaml, which Astro
  // uses to read the file, would make it a Date. Quote such strings everywhere
  // except in the fields that really are dates.
  visit(doc, {
    Scalar(key, node, ancestors) {
      if (typeof node.value !== 'string' || !DATE_LIKE_RE.test(node.value)) return;
      const parent = ancestors[ancestors.length - 1];
      const ownKey = parent instanceof Pair && key === 'value' ? parent.key?.value : undefined;
      if (DATE_KEYS.has(ownKey)) return;
      node.type = Scalar.QUOTE_DOUBLE;
    },
  });
  return doc.toString({ lineWidth: 100, minContentWidth: 40 });
}

function toMarkdownFile(data, body, options) {
  return `---\n${toYaml(data, options)}---\n\n${String(body).trim()}\n`;
}

// ------------------------------------------------------------- builders

function labExists(id, roots) {
  return Promise.any(roots.map((root) => fs.access(path.join(root, 'data', 'labs', `${id}.yml`)))).then(
    () => true,
    () => false,
  );
}

async function warnUnknownLab(id, label, ctx) {
  if (id && !(await labExists(id, [ctx.outRoot, REPO_ROOT]))) {
    ctx.warnings.push(`${label} "${id}" has no file data/labs/${id}.yml yet; the page will show no lab link until it exists.`);
  }
}

function buildLab(v, ctx) {
  const { problems, warnings, issue, created } = ctx;
  crossChecks('lab', v, problems);
  const city = v.city === OTHER_CITY ? v.city_other : v.city;
  const slug = pickSlug(
    [
      [v.pi, 'The PI name'],
      [v.lab, 'the lab name'],
      [v.institution, 'the institution'],
    ],
    `lab-issue-${issue.number}`,
    warnings,
  );
  const data = {
    pi: v.pi,
    pi_native: v.pi_native,
    lab: v.lab,
    institution: v.institution,
    institution_short: v.institution_short,
    department: v.department,
    city,
    tier: v.tier,
    website: v.website,
    email: v.email,
    scholar: v.scholar,
    github: v.github,
    orcid: v.orcid,
    profile: v.profile,
    photo: v.photo ? `${slug}.webp` : undefined,
    keywords: v.keywords,
    description: v.description,
    looking_for: v.looking_for,
    joined: created,
  };
  const where = v.institution_short || v.institution;
  return {
    slug,
    file: `data/labs/${slug}.yml`,
    data,
    folded: ['description'],
    // The photo is optional; without one the roster shows the PI's initials.
    photo: v.photo ? { source: v.photo, file: `public/photos/${slug}.webp` } : undefined,
    title: where ? `${v.pi} (${where})` : v.pi,
  };
}

async function buildEvent(v, ctx) {
  const { problems, issue } = ctx;
  crossChecks('event', v, problems);
  let slug = truncateSlug(slugify(v.speaker || v.title));
  if (asciiLetters(slug) < 2) slug = truncateSlug(slugify(v.title));
  if (asciiLetters(slug) < 2) slug = `issue-${issue.number}`;
  const id = `${v.date}-${slug}`;

  // An affiliation or talk title without a name is a problem crossChecks has
  // already recorded; here it simply means there is no junior speaker.
  const junior = v.junior_name ? { name: v.junior_name, affiliation: v.junior_affiliation, title: v.junior_title } : undefined;
  await warnUnknownLab(v.host_lab, 'Host lab id', ctx);

  const data = {
    title: v.title,
    type: v.type,
    date: v.date,
    end_date: v.end_date,
    start: v.start,
    end: v.end,
    speaker: v.speaker,
    speaker_native: v.speaker_native,
    speaker_affiliation: v.speaker_affiliation,
    speaker_url: v.speaker_url,
    junior_speaker: junior,
    host_lab: v.host_lab,
    host_institution: v.host_institution,
    location: v.location || 'Online',
    platform: v.platform === IN_PERSON_ONLY ? undefined : v.platform,
    registration_url: v.registration_url,
  };
  return { slug: id, file: `data/events/${id}.md`, data, body: v.abstract, quoted: ['start', 'end'], title: v.title };
}

async function buildTutorial(v, ctx) {
  const { problems, issue, created } = ctx;
  crossChecks('tutorial', v, problems);
  let slug = truncateSlug(slugify(v.title));
  if (asciiLetters(slug) < 2) slug = `tutorial-issue-${issue.number}`;
  await warnUnknownLab(v.lab, 'Lab id', ctx);
  const data = {
    title: v.title,
    authors: v.authors,
    lab: v.lab,
    format: v.format,
    level: v.level,
    language: v.language,
    url: v.url,
    doi: v.doi,
    topics: v.topics,
    description: v.description,
    added: created,
  };
  return { slug, file: `data/tutorials/${slug}.yml`, data, folded: ['description'], title: v.title };
}

async function buildPosition(v, ctx) {
  const { problems, warnings, issue, created, today } = ctx;
  crossChecks('position', v, problems, today);
  let slug = truncateSlug(slugify(v.title));
  if (asciiLetters(slug) < 2) slug = `position-issue-${issue.number}`;
  if (!v.deadline && !v.expires) warnings.push('No deadline or removal date: the listing will stay up until someone removes it by hand.');
  await warnUnknownLab(v.lab, 'Lab id', ctx);
  const data = {
    title: v.title,
    type: v.type,
    lab: v.lab,
    pi: v.pi,
    institution: v.institution,
    city: v.city,
    url: v.url,
    contact_email: v.contact_email,
    posted: created,
    deadline: v.deadline,
    expires: v.expires,
  };
  return { slug, file: `data/positions/${slug}.md`, data, body: v.body, title: v.title };
}

const BUILDERS = { lab: buildLab, event: buildEvent, tutorial: buildTutorial, position: buildPosition };

// ---------------------------------------------------------------- photos

/**
 * The image to use from the photo field: the first GitHub-hosted image
 * (Markdown image, <img>, or a bare attachment URL). If none is GitHub-hosted,
 * the first image found is returned so that the error can name its host.
 */
export function findImageUrl(text, allowFile = false) {
  const source = String(text ?? '');
  const candidates = [];
  for (const m of source.matchAll(/!\[[^\]]*\]\(\s*<?((?:https?|file):\/\/[^\s)>]+)>?/g)) candidates.push(m[1]);
  for (const m of source.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) candidates.push(m[1]);
  for (const m of source.matchAll(/https:\/\/(?:github\.com\/user-attachments\/(?:assets|files)\/|(?:private-)?user-images\.githubusercontent\.com\/)[^\s)>\]"']+/g)) {
    candidates.push(m[0]);
  }
  if (allowFile) for (const m of source.matchAll(/file:\/\/[^\s)>\]"']+/g)) candidates.push(m[0]);
  const usable = candidates.find((u) => {
    try {
      const p = new URL(u);
      return (p.protocol === 'https:' && allowedPhotoHost(p.hostname)) || (allowFile && p.protocol === 'file:');
    } catch {
      return false;
    }
  });
  return usable ?? candidates[0] ?? null;
}

function allowedPhotoHost(hostname) {
  return hostname === 'github.com' || hostname === 'www.github.com' || hostname.endsWith('.githubusercontent.com');
}

async function fetchWithCap(url, headers) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'gba-ccn-intake', ...headers } });
  if (res.status !== 200) {
    await res.body?.cancel().catch(() => {});
    return { status: res.status };
  }
  const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const declared = Number(res.headers.get('content-length'));
  if (declared > MAX_PHOTO_BYTES) {
    await res.body?.cancel().catch(() => {});
    throw new SubmissionError(`The photo is ${(declared / 1048576).toFixed(1)} MB; the limit is 10 MB. Upload a smaller file.`);
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.byteLength;
    if (total > MAX_PHOTO_BYTES) throw new SubmissionError('The photo is larger than 10 MB. Upload a smaller file.');
    chunks.push(chunk);
  }
  return { status: 200, contentType, buffer: Buffer.concat(chunks) };
}

async function downloadImage(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new SubmissionError(`The photo link is not a valid URL (${url}).`);
  }
  if (parsed.protocol === 'file:') {
    if (process.env.INTAKE_ALLOW_FILE_URLS !== '1') {
      throw new SubmissionError('The photo must be uploaded to the issue (drag the file into the photo field), not linked as a local file.');
    }
    const buffer = await fs.readFile(fileURLToPath(parsed));
    if (buffer.byteLength > MAX_PHOTO_BYTES) throw new SubmissionError('The photo is larger than 10 MB. Upload a smaller file.');
    return buffer;
  }
  if (parsed.protocol !== 'https:' || !allowedPhotoHost(parsed.hostname)) {
    throw new SubmissionError(
      `The photo must be uploaded to the issue itself (drag the file into the photo field) so that GitHub hosts it; a link to ${parsed.hostname || 'another site'} is not accepted.`,
    );
  }
  let result;
  try {
    result = await fetchWithCap(url, {});
    if (result.status !== 200 && process.env.GITHUB_TOKEN) {
      result = await fetchWithCap(url, { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` });
    }
  } catch (err) {
    if (err instanceof SubmissionError) throw err;
    // A network failure is not the submitter's fault; say so without a stack trace.
    const why = err?.cause?.code ?? err?.code ?? err?.message ?? 'network error';
    throw new SubmissionError(`The photo could not be downloaded from GitHub (${why}). Nothing is wrong with the form; edit the issue, or ask a coordinator to re-run the check.`);
  }
  if (result.status !== 200) {
    throw new SubmissionError(`The photo could not be downloaded (HTTP ${result.status}). Re-attach it by dragging the image into the photo field.`);
  }
  const ct = result.contentType;
  if (ct === 'image/svg+xml' || !(ct.startsWith('image/') || ct === 'application/octet-stream' || ct === '')) {
    throw new SubmissionError(`The attachment is not an image (content type ${ct || 'unknown'}). Upload a JPEG, PNG or WebP photo.`);
  }
  return result.buffer;
}

async function writePhoto(buffer, destination, warnings) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    meta = null;
  }
  if (!meta || !IMAGE_FORMATS.has(meta.format)) {
    throw new SubmissionError('The photo is not a readable JPEG, PNG or WebP image. Export it in one of those formats and attach it again.');
  }
  if (Math.min(meta.width ?? 0, meta.height ?? 0) < 300) {
    warnings.push(`The photo is only ${meta.width}x${meta.height} pixels and will look soft at 400x400; a larger one would be better.`);
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  // sharp strips metadata (EXIF, GPS, colour profile) unless asked to keep it;
  // rotate() first applies the EXIF orientation so the crop is upright.
  await sharp(buffer, { limitInputPixels: 80e6 })
    .rotate()
    .resize(PHOTO_SIZE, PHOTO_SIZE, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(destination);
}

async function processPhoto(source, destination, warnings) {
  const url = findImageUrl(source, process.env.INTAKE_ALLOW_FILE_URLS === '1');
  if (!url) {
    throw new SubmissionError(
      'No image was found in "PI photo". Drag an image file into that field so that GitHub uploads it, or leave the field empty; a link to a web page does not work.',
    );
  }
  const buffer = await downloadImage(url);
  await writePhoto(buffer, destination, warnings);
}

/**
 * A file with the same name already on main that was not created from this
 * issue belongs to someone else (a second "Wei Zhang", a second "PhD position").
 * Suffix the issue number instead of proposing to overwrite it. A file created
 * from this very issue is the normal regeneration after an edit.
 */
async function avoidCollision(entry, issue, warnings) {
  const existing = path.join(REPO_ROOT, entry.file);
  let head;
  try {
    head = (await fs.readFile(existing, 'utf8')).split('\n').slice(0, 3).join('\n');
  } catch {
    return;
  }
  if (new RegExp(`Created from issue #${Number(issue.number)}\\b`).test(head)) return;
  const suffix = `-${Number(issue.number)}`;
  const ext = path.extname(entry.file);
  const previous = path.basename(entry.file);
  entry.slug = `${entry.slug}${suffix}`;
  entry.file = `${entry.file.slice(0, -ext.length)}${suffix}${ext}`;
  if (entry.photo) {
    entry.photo.file = `public/photos/${entry.slug}.webp`;
    entry.data.photo = `${entry.slug}.webp`;
  }
  warnings.push(
    `${previous} already exists on main and was not created from this issue, so this entry is saved as ${path.basename(entry.file)}. If both describe the same lab or listing, a coordinator should merge them in the pull request.`,
  );
}

// ------------------------------------------------------------------ main

/**
 * Run the intake for one event payload. Returns
 * { type, slug, title, files, warnings } or, when there is nothing to do,
 * { type, files: [], message }.
 */
export async function runIntake({ eventPath, outRoot = REPO_ROOT }) {
  const event = JSON.parse(await fs.readFile(eventPath, 'utf8'));
  const issue = event?.issue;
  if (!issue || typeof issue !== 'object') return { type: null, files: [], message: 'The payload has no issue; nothing to do.' };

  const labels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l?.name)).filter(Boolean);
  const type = detectType(labels, issue.title);
  if (!type) return { type: null, files: [], message: 'This issue is not a form submission (no intake label or known title prefix); nothing to do.' };
  if (type === 'nomination') return { type, files: [], message: 'Speaker nominations stay with the coordinators; no data file is created.' };

  const problems = [];
  const warnings = [];
  const values = readFields(FORMS[type], issue.body ?? '', problems);
  const created = dateInHongKong(issue.created_at);
  // A deadline is compared with today, not with the issue's creation date: an
  // edit may arrive months later.
  const today = dateInHongKong(new Date().toISOString());
  const entry = await BUILDERS[type](values, { problems, warnings, issue, created, today, outRoot });
  if (problems.length) throw new SubmissionError(problems);

  await avoidCollision(entry, issue, warnings);

  const files = [];
  if (entry.photo) {
    await processPhoto(entry.photo.source, path.join(outRoot, entry.photo.file), warnings);
    files.push(entry.photo.file);
  }
  const comment = `Created from issue #${Number(issue.number)} by the intake workflow. Edit this file by pull request.`;
  const options = { quoted: entry.quoted, folded: entry.folded, comment };
  const text = entry.body !== undefined ? toMarkdownFile(entry.data, entry.body, options) : toYaml(entry.data, options);
  const target = path.join(outRoot, entry.file);
  try {
    await fs.access(path.join(REPO_ROOT, entry.file));
    warnings.push(`${entry.file} already exists on main; this submission replaces it. The pull request lists it as a replacement.`);
  } catch {
    // New entry.
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, text, 'utf8');
  files.unshift(entry.file);

  return { type, slug: entry.slug, title: entry.title, files, warnings };
}

function eventPathFromArgs() {
  const i = process.argv.indexOf('--event');
  if (i !== -1) {
    const value = process.argv[i + 1];
    if (!value) throw new Error('--event needs a file path.');
    return path.resolve(value);
  }
  if (process.env.GITHUB_EVENT_PATH) return process.env.GITHUB_EVENT_PATH;
  throw new Error('No event payload: set GITHUB_EVENT_PATH or pass --event <file>.');
}

const oneLine = (text) => String(text ?? '').replace(/[\x00-\x1f\x7f]+/g, ' ').trim();

async function main() {
  const eventPath = eventPathFromArgs();
  const outRoot = path.resolve(process.env.INTAKE_ROOT || REPO_ROOT);
  const result = await runIntake({ eventPath, outRoot });
  for (const w of result.warnings ?? []) console.error(`Warning: ${w}`);
  if (!result.files.length) {
    console.log(result.message);
    return;
  }
  const summary = { type: result.type, files: result.files, slug: result.slug, title: result.title };
  console.log(JSON.stringify(summary));
  if (process.env.GITHUB_OUTPUT) {
    const lines = [
      `files=${result.files.join(' ')}`,
      `slug=${result.slug}`,
      `type=${result.type}`,
      `title=${oneLine(result.title)}`,
    ];
    await fs.appendFile(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof SubmissionError ? err.message : err?.stack || String(err));
    process.exit(1);
  });
}
