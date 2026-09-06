#!/usr/bin/env node
// Tests for the intake pipeline. Everything is written under .intake/test-out
// (INTAKE_ROOT), never under data/. At the end, if Astro is installed, the
// generated files are copied into data/ and public/photos/ for one validation
// build and removed again in a finally block, whatever happens.
//
//   node scripts/test-intake.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';
import { CONSENT_PRIVACY, CONSENT_PUBLISH, DATA_TYPES, FORMS, OTHER_CITY, detectType } from './lib/forms.mjs';
import { parseCheckboxes, parseIssueForm } from './lib/issue-form.mjs';
import { checkNoMeetingLinks, crossChecks, readFields, readValues } from './lib/validate.mjs';
import { REPO_ROOT, findImageUrl, slugify } from './intake.mjs';

const OUT = path.join(REPO_ROOT, '.intake', 'test-out');
const FIXTURES = path.join(REPO_ROOT, 'scripts', 'fixtures');
const INTAKE = path.join(REPO_ROOT, 'scripts', 'intake.mjs');
const TEMPLATES = path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE');

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`not ok - ${name}\n    ${String(err?.stack || err).replace(/\n/g, '\n    ')}`);
  }
}

// ------------------------------------------------------------ utilities

async function loadFixture(name, edit = (p) => p, photoUrl = '') {
  const payload = edit(JSON.parse(await fs.readFile(path.join(FIXTURES, `${name}.json`), 'utf8')));
  payload.issue.body = payload.issue.body.replace('__PHOTO_URL__', photoUrl);
  return payload;
}

async function writeEvent(name, payload) {
  const file = path.join(OUT, 'events', `${name}.json`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, 2));
  return file;
}

function runIntake(eventFile, { root = OUT, allowFile = true } = {}) {
  const outputFile = `${eventFile}.output.txt`;
  const env = { ...process.env, INTAKE_ROOT: root, GITHUB_OUTPUT: outputFile };
  delete env.GITHUB_EVENT_PATH;
  delete env.GITHUB_TOKEN;
  if (allowFile) env.INTAKE_ALLOW_FILE_URLS = '1';
  else delete env.INTAKE_ALLOW_FILE_URLS;
  const result = spawnSync(process.execPath, [INTAKE, '--event', eventFile], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  const lines = result.stdout.trim().split('\n');
  let summary = null;
  try {
    summary = JSON.parse(lines[lines.length - 1]);
  } catch {
    summary = null;
  }
  return { ...result, summary, outputFile };
}

function splitFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(text);
  assert.ok(m, `no frontmatter in:\n${text}`);
  return { data: parseYaml(m[1]), body: m[2] };
}

async function readGenerated(rel) {
  return fs.readFile(path.join(OUT, rel), 'utf8');
}

function expectFailure(result, ...needles) {
  assert.notEqual(result.status, 0, `expected a non-zero exit, got stdout:\n${result.stdout}`);
  for (const needle of needles) assert.match(result.stderr, needle);
}

// -------------------------------------------------------------- set-up

await fs.rm(OUT, { recursive: true, force: true });
await fs.rm(path.join(REPO_ROOT, '.intake', 'dist-check'), { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

// A tiny non-square PNG; the intake must crop it to a 400x400 WebP.
const photoFile = path.join(OUT, 'fixture-photo.png');
await sharp({ create: { width: 64, height: 96, channels: 3, background: { r: 30, g: 110, b: 124 } } })
  .png()
  .toFile(photoFile);
const photoUrl = pathToFileURL(photoFile).href;

const generated = []; // repo-relative paths of files to validate with Astro

// ------------------------------------------------------------- unit tests

await test('detectType prefers labels and falls back to the title prefix', () => {
  assert.equal(detectType(['intake', 'intake:lab'], 'anything'), 'lab');
  assert.equal(detectType(['intake:event'], '[Lab] wrong prefix'), 'event');
  assert.equal(detectType([], '  [tutorial] lower case'), 'tutorial');
  assert.equal(detectType([], '[Position] RA'), 'position');
  assert.equal(detectType(['speaker-nomination'], ''), 'nomination');
  assert.equal(detectType([], '[Speaker] Someone'), 'nomination');
  assert.equal(detectType(['bug'], 'Site is down'), null);
});

await test('parseIssueForm handles empty fields, CRLF, checkboxes and headings inside values', () => {
  const body = '### Title\r\n\r\nHello\r\n\r\n### Lab id\r\n\r\n_No response_\r\n\r\n### Abstract (Markdown)\r\n\r\nPara\r\n\r\n### Bio\r\n\r\nText\r\n\r\n### Consent\r\n\r\n- [X] yes\r\n- [ ] no\r\n';
  const known = ['Title', 'Lab id', 'Abstract (Markdown)', 'Consent'];
  const fields = parseIssueForm(body, known);
  assert.equal(fields.get('Title'), 'Hello');
  assert.equal(fields.get('Lab id'), '');
  assert.equal(fields.get('Abstract (Markdown)'), 'Para\n\n### Bio\n\nText');
  assert.deepEqual(parseCheckboxes(fields.get('Consent')), [
    { label: 'yes', checked: true },
    { label: 'no', checked: false },
  ]);
  // Without known labels every heading is a field.
  assert.equal(parseIssueForm(body).get('Bio'), 'Text');
});

await test('headings typed inside a textarea cannot hijack other fields', () => {
  const known = ['Event title', 'Location', 'Abstract (Markdown)', 'Consent'];
  const body = [
    '### Event title', '', 'Real title', '',
    '### Location', '', 'Online', '',
    '### Abstract (Markdown)', '', 'Para one.', '',
    '### Location', '', 'Room 101', '',
    '### Consent', '', 'fake', '',
    '### Event title', '', 'Hijack', '',
    '### Consent', '', '- [X] ok', '',
  ].join('\r\n');
  const f = parseIssueForm(body, known);
  assert.equal(f.get('Event title'), 'Real title');
  assert.equal(f.get('Location'), 'Online');
  assert.equal(
    f.get('Abstract (Markdown)'),
    'Para one.\n\n### Location\n\nRoom 101\n\n### Consent\n\nfake\n\n### Event title\n\nHijack',
  );
  assert.equal(f.get('Consent'), '- [X] ok');
  // A field the submitter left out entirely is simply absent.
  assert.equal(parseIssueForm('### Location\n\nOnline\n', known).has('Consent'), false);
});

await test('slugify and findImageUrl', () => {
  assert.equal(slugify('Jörg Müller-Lüdenscheidt'), 'jorg-muller-ludenscheidt');
  assert.equal(slugify('  Jane   Doe, PhD. '), 'jane-doe-phd');
  assert.equal(slugify('滕相斌'), '');
  assert.equal(slugify('Łukasz Øystein Straße Đorđe'), 'lukasz-oystein-strasse-dorde');
  assert.equal(findImageUrl('![Image](https://github.com/user-attachments/assets/abc-123)'), 'https://github.com/user-attachments/assets/abc-123');
  assert.equal(
    findImageUrl('<img width="400" alt="Image" src="https://github.com/user-attachments/assets/abc-123" />'),
    'https://github.com/user-attachments/assets/abc-123',
  );
  assert.equal(findImageUrl('see https://github.com/user-attachments/assets/abc-123 above'), 'https://github.com/user-attachments/assets/abc-123');
  assert.equal(findImageUrl('https://example.org/photo.jpg'), null);
  assert.equal(findImageUrl('file:///tmp/x.png'), null);
  assert.equal(findImageUrl('file:///tmp/x.png', true), 'file:///tmp/x.png');
});

await test('issue templates agree with the field mapping', async () => {
  for (const [type, form] of Object.entries(FORMS)) {
    const template = parseYaml(await fs.readFile(path.join(TEMPLATES, form.template), 'utf8'));
    assert.ok(template.title.startsWith(`${form.prefix} `), `${form.template}: title prefix`);
    assert.ok(template.labels.includes(form.label), `${form.template}: label ${form.label}`);
    if (DATA_TYPES.includes(type)) assert.ok(template.labels.includes('intake'), `${form.template}: intake label`);
    const elements = template.body.filter((el) => el.type !== 'markdown');
    const byId = new Map(elements.map((el) => [el.id, el]));
    assert.deepEqual([...byId.keys()], form.fields.map((f) => f.id), `${form.template}: field ids and order`);
    for (const field of form.fields) {
      const el = byId.get(field.id);
      assert.equal(el.attributes.label, field.label, `${form.template}: label of ${field.id}`);
      assert.equal(Boolean(el.validations?.required), field.required, `${form.template}: required flag of ${field.id}`);
      if (field.kind === 'enum') {
        assert.equal(el.type, 'dropdown', `${form.template}: ${field.id} is a dropdown`);
        assert.deepEqual(el.attributes.options, [...field.options], `${form.template}: options of ${field.id}`);
        if (field.default !== undefined && el.attributes.default !== undefined) {
          assert.equal(el.attributes.options[el.attributes.default], field.default, `${form.template}: default of ${field.id}`);
        }
      } else if (field.kind === 'checkboxes') {
        assert.equal(el.type, 'checkboxes');
        assert.deepEqual(
          el.attributes.options.map((o) => ({ label: o.label, required: Boolean(o.required) })),
          field.options.map((o) => ({ label: o.label, required: Boolean(o.required) })),
          `${form.template}: checkbox options of ${field.id}`,
        );
      } else if (field.kind === 'markdown' || field.kind === 'image') {
        assert.equal(el.type, 'textarea', `${form.template}: ${field.id} is a textarea`);
      }
    }
  }
});

// --------------------------------------------- the web form: readValues
//
// The web form posts {fieldId: value} instead of a Markdown body. readValues
// applies the same ladder as readFields, so the two must agree field by field.

/** The labels of the boxes a submitter has to tick, from the mapping itself. */
const requiredBoxes = (type, id) =>
  FORMS[type].fields.find((f) => f.id === id).options.filter((o) => o.required).map((o) => o.label);

/** The issue body the worker will build from a payload: what GitHub would write. */
function renderBody(form, values) {
  return form.fields
    .map((field) => {
      let text;
      if (field.kind === 'checkboxes') {
        const ticked = new Set(values[field.id] ?? []);
        text = field.options.map((o) => `- [${ticked.has(o.label) ? 'X' : ' '}] ${o.label}`).join('\n');
      } else {
        text = String(values[field.id] ?? '').trim() || '_No response_';
      }
      return `### ${field.label}\n\n${text}\n\n`;
    })
    .join('');
}

const SAMPLES = {
  lab: {
    pi: 'Testa Fixture',
    pi_native: '測試 菲克',
    lab: 'Fixture Lab',
    institution: 'Fixture University of Science and Technology',
    institution_short: 'FUST',
    department: 'Department of Test Engineering',
    city: 'Shenzhen',
    city_other: '',
    tier: 'member',
    website: 'https://example.org/fixture-lab',
    email: 'testa.fixture@example.org',
    scholar: '',
    github: '',
    orcid: '0000-0002-1825-0097',
    profile: '',
    keywords: 'working memory, decision making',
    description: 'A synthetic lab used by the web-form tests.',
    looking_for: '',
    photo: '',
    consent: [CONSENT_PUBLISH, CONSENT_PRIVACY],
  },
  event: {
    title: 'Fixture seminar: keeping time in cortex',
    type: 'seminar',
    date: '2027-03-04',
    end_date: '',
    start: '16:00',
    end: '17:00',
    speaker: 'Testa Fixture',
    speaker_native: '',
    speaker_affiliation: 'Fixture University of Science and Technology',
    speaker_url: 'https://example.org/fixture-lab',
    junior_name: '',
    junior_affiliation: '',
    junior_title: '',
    host_lab: 'xiangbin-teng',
    host_institution: '',
    location: 'Online',
    platform: 'Zoom',
    registration_url: '',
    abstract: 'First paragraph of the abstract.\n\nSecond paragraph.',
    consent: requiredBoxes('event', 'consent'),
  },
  tutorial: {
    title: 'Fitting fixture models to choice data',
    authors: 'Testa Fixture, Wei Fixture',
    lab: 'example-lab',
    format: 'notebook',
    level: 'introductory',
    language: 'English',
    url: 'https://github.com/example/fixture-tutorial',
    doi: 'https://doi.org/10.5281/zenodo.0000000',
    topics: 'decision making, Python',
    description: 'A short description of the material.',
    consent: requiredBoxes('tutorial', 'consent'),
  },
  position: {
    title: 'Fixture postdoc in computational models of testing',
    type: 'postdoc',
    lab: 'example-lab',
    pi: 'Testa Fixture',
    institution: 'Fixture University of Science and Technology',
    city: 'Shenzhen',
    url: 'https://example.org/fixture-lab/jobs/postdoc',
    contact_email: 'testa.fixture@example.org',
    deadline: '2027-06-30',
    expires: '',
    body: 'Two or three sentences about the position.',
  },
  nomination: {
    name: 'Testa Fixture',
    affiliation: 'Fixture University of Science and Technology',
    url: 'https://example.org/fixture-lab',
    why: 'Works on the timing of speech perception.',
    suggested_host: '',
    willing_to_host: [],
    note: '',
  },
};

await test('readValues accepts a complete submission of every type', () => {
  for (const [type, values] of Object.entries(SAMPLES)) {
    const problems = [];
    const read = readValues(FORMS[type], values, problems);
    assert.deepEqual(problems, [], `${type}: ${problems.join(' ')}`);
    assert.deepEqual(Object.keys(read), FORMS[type].fields.map((f) => f.id), `${type}: keys`);
  }
  const problems = [];
  const lab = readValues(FORMS.lab, SAMPLES.lab, problems);
  assert.deepEqual(lab.keywords, ['working memory', 'decision making']);
  assert.deepEqual(lab.consent, [true, true]);
  assert.equal(lab.photo, undefined, 'the web form sends no photo');
  const event = readValues(FORMS.event, SAMPLES.event, problems);
  assert.equal(event.date, '2027-03-04');
  assert.equal(event.start, '16:00');
  assert.deepEqual(event.consent, [true, false]);
  const tutorial = readValues(FORMS.tutorial, SAMPLES.tutorial, problems);
  assert.equal(tutorial.doi, '10.5281/zenodo.0000000', 'the doi.org prefix is stripped');
  assert.deepEqual(problems, []);
});

await test('readValues and readFields agree on the same submission', () => {
  for (const [type, values] of Object.entries(SAMPLES)) {
    const fromValues = [];
    const fromBody = [];
    assert.deepEqual(
      readValues(FORMS[type], values, fromValues),
      readFields(FORMS[type], renderBody(FORMS[type], values), fromBody),
      `${type}: values and body disagree`,
    );
    assert.deepEqual(fromValues, fromBody, `${type}: problems disagree`);
  }
});

await test('readValues refuses a missing required field, a bad email and an over-length description', () => {
  const problems = [];
  readValues(FORMS.lab, { ...SAMPLES.lab, institution: '', email: 'testa.fixture at example.org', description: 'x'.repeat(701) }, problems);
  assert.deepEqual(problems, [
    '"Institution" is required.',
    '"Contact email (public if given)" does not look like an email address (got "testa.fixture at example.org").',
    '"Description (one or two sentences, max 700 characters)" is 701 characters long; the maximum is 700.',
  ]);
  // A malformed payload is reported, not coerced into something plausible.
  const wrongType = [];
  readValues(FORMS.lab, { ...SAMPLES.lab, pi: ['Testa', 'Fixture'] }, wrongType);
  assert.deepEqual(wrongType, ['"PI name (Latin script)" must be a single line of text.']);
});

await test('readValues refuses a bad date and a city that is not in the dropdown', () => {
  const dates = [];
  const event = readValues(FORMS.event, { ...SAMPLES.event, date: '2027-13-40' }, dates);
  assert.deepEqual(dates, ['"Date (YYYY-MM-DD)" must be a real date written YYYY-MM-DD (got "2027-13-40").']);
  assert.equal(event.date, undefined, 'a rejected date must not reach the builder');

  const cities = [];
  readValues(FORMS.lab, { ...SAMPLES.lab, city: 'Beijing' }, cities);
  assert.equal(cities.length, 1);
  assert.match(cities[0], /^"City" must be one of: Hong Kong, Shenzhen, /);
  assert.match(cities[0], /\(got "Beijing"\)\.$/);

  // A member lab outside the Greater Bay Area can only be written by choosing
  // "Other" and typing the city. That combination passes the field ladder; it
  // is buildLab in intake.mjs that refuses it, as the fixture test above shows.
  const outside = [];
  const values = readValues(FORMS.lab, { ...SAMPLES.lab, city: OTHER_CITY, city_other: 'Beijing' }, outside);
  assert.deepEqual(outside, []);
  assert.equal(values.city_other, 'Beijing');
});

await test('readValues refuses an unticked required consent box', () => {
  const one = [];
  const values = readValues(FORMS.lab, { ...SAMPLES.lab, consent: [CONSENT_PUBLISH] }, one);
  assert.equal(one.length, 1);
  assert.match(one[0], /^Tick the box "I have read the privacy and consent statement" under "Consent"\.$/);
  assert.deepEqual(values.consent, [true, false]);

  const none = [];
  readValues(FORMS.lab, { ...SAMPLES.lab, consent: [] }, none);
  assert.equal(none.length, 2);
  // A ticked box that is not one of the declared labels counts for nothing.
  const wrong = [];
  readValues(FORMS.lab, { ...SAMPLES.lab, consent: ['I agree to everything'] }, wrong);
  assert.equal(wrong.length, 2);
});

await test('a meeting link in a public field is refused', () => {
  const problems = [];
  const values = readValues(FORMS.event, { ...SAMPLES.event, abstract: 'Join at https://zoom.us/j/1234567890 passcode: 1234.' }, problems);
  assert.deepEqual(problems, [], 'the field ladder does not judge the text itself');
  // The same call buildEvent makes; the worker must make it too.
  checkNoMeetingLinks([values.title, values.abstract, values.location, values.speaker_url], problems);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /meeting link or passcode/);

  const clean = [];
  const ok = readValues(FORMS.event, SAMPLES.event, clean);
  checkNoMeetingLinks([ok.title, ok.abstract, ok.location, ok.speaker_url], clean);
  assert.deepEqual(clean, []);
});

// ------------------------------------------- the rules across fields
//
// crossChecks holds every rule that compares two fields. Both doors run it on
// the value object readFields/readValues returns, so each rule is tested here
// on that object, and the agreement with the intake script is tested on a
// fixture further down.

/** The values of a sample with a few fields changed, and its cross problems. */
function crossOf(type, patch, today) {
  const problems = [];
  const values = readValues(FORMS[type], { ...SAMPLES[type], ...patch }, problems);
  assert.deepEqual(problems, [], `${type}: the field ladder itself complained: ${problems.join(' ')}`);
  crossChecks(type, values, problems, today);
  return problems;
}

await test('crossChecks refuses "Other" as the city with no city typed', () => {
  assert.deepEqual(crossOf('lab', { city: OTHER_CITY, city_other: '' }), [
    'You chose "Other" as the city; fill in "If Other, which city?".',
  ]);
  assert.deepEqual(crossOf('lab', {}), []);
});

await test('crossChecks refuses a member lab outside the Greater Bay Area', () => {
  const problems = crossOf('lab', { city: OTHER_CITY, city_other: 'Beijing' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^Member labs must be in a Greater Bay Area city \(Hong Kong, Shenzhen, /);
  assert.match(problems[0], /"Beijing" is not one\. Choose the city from the list, or choose the tier "affiliate"\.$/);
  // The same lab as an affiliate is exactly what the tier is for.
  assert.deepEqual(crossOf('lab', { city: OTHER_CITY, city_other: 'Beijing', tier: 'affiliate' }), []);
});

await test('crossChecks refuses an end date before the date', () => {
  assert.deepEqual(crossOf('event', { end_date: '2027-03-03' }), ['The end date is before the date.']);
  assert.deepEqual(crossOf('event', { end_date: '2027-03-05' }), []);
});

await test('crossChecks refuses an end time without a start time', () => {
  assert.deepEqual(crossOf('event', { start: '', end: '17:00' }), ['An end time was given without a start time.']);
});

await test('crossChecks refuses an end time that is not after the start on one day', () => {
  assert.deepEqual(crossOf('event', { start: '17:00', end: '16:00' }), ['The end time must be after the start time.']);
  assert.deepEqual(crossOf('event', { start: '16:00', end: '16:00' }), ['The end time must be after the start time.']);
  // On a multi-day event the times belong to different days.
  assert.deepEqual(crossOf('event', { end_date: '2027-03-05', start: '17:00', end: '16:00' }), []);
});

await test('crossChecks refuses a junior speaker affiliation or talk title without a name', () => {
  const message = 'A junior speaker affiliation or talk title was given without the junior speaker name.';
  assert.deepEqual(crossOf('event', { junior_affiliation: 'The University of Hong Kong' }), [message]);
  assert.deepEqual(crossOf('event', { junior_title: 'A normative model of test errors' }), [message]);
  assert.deepEqual(crossOf('event', { junior_name: 'Wei Fixture', junior_title: 'A normative model of test errors' }), []);
});

await test('crossChecks refuses a deadline that is already past', () => {
  assert.deepEqual(crossOf('position', { deadline: '2027-06-30' }, '2027-07-01'), [
    'The application deadline (2027-06-30) is already past.',
  ]);
  // The deadline day itself still counts.
  assert.deepEqual(crossOf('position', { deadline: '2027-06-30' }, '2027-06-30'), []);
  // Forgetting to pass today is a caller bug, not a submission the door lets through.
  assert.throws(() => crossChecks('position', {}, []), /needs today as YYYY-MM-DD/);
});

await test('crossChecks refuses a removal date before the deadline', () => {
  assert.deepEqual(crossOf('position', { deadline: '2027-06-30', expires: '2027-06-01' }, '2026-09-06'), [
    'The removal date is before the application deadline.',
  ]);
  assert.deepEqual(crossOf('position', { deadline: '2027-06-30', expires: '2027-07-31' }, '2026-09-06'), []);
});

await test('crossChecks refuses a meeting link in every type that carries one', () => {
  const link = 'Join at https://meeting.tencent.com/dm/abcdef, passcode: 4242.';
  const cases = [
    ['event', { abstract: link }],
    ['tutorial', { description: link }],
    ['position', { body: link }],
  ];
  for (const [type, patch] of cases) {
    const problems = crossOf(type, patch, '2026-09-06');
    assert.equal(problems.length, 1, `${type}: ${problems.join(' ')}`);
    assert.match(problems[0], /meeting link or passcode/, type);
    assert.deepEqual(crossOf(type, {}, '2026-09-06'), [], `${type}: the clean sample must pass`);
  }
  // Titles and links are read too, not only the long free-text field.
  assert.equal(crossOf('event', { registration_url: 'https://zoom.us/j/1234567890' }).length, 1);
  assert.equal(crossOf('tutorial', { url: 'https://zoom.us/j/1234567890' }).length, 1);
});

await test('crossChecks reads every field that reaches a public file', () => {
  const link = 'https://zoom.us/j/1234567890';
  // A lab entry carries no meeting link of its own, but nothing stopped one
  // being pasted into the description or the "looking for" line.
  for (const field of ['lab', 'department', 'institution', 'description', 'looking_for']) {
    const problems = crossOf('lab', { [field]: `Somewhere ${link}` });
    assert.equal(problems.length, 1, `lab.${field}: ${problems.join(' ')}`);
    assert.match(problems[0], /meeting link or passcode/, `lab.${field}`);
  }
  // An event's speaker and junior-talk fields are published as surely as its
  // abstract. The junior fields need a name alongside them, or the rule about
  // a nameless junior talk fires as well and the count is two.
  for (const field of ['speaker', 'speaker_native', 'junior_name', 'junior_affiliation', 'junior_title']) {
    const withName = field.startsWith('junior_') ? { junior_name: 'Wei Zhang' } : {};
    const problems = crossOf('event', { ...withName, [field]: `Someone ${link}` });
    assert.equal(problems.length, 1, `event.${field}: ${problems.join(' ')}`);
    assert.match(problems[0], /meeting link or passcode/, `event.${field}`);
  }
});

await test('an ORCID iD is validated at the door, whichever door it came through', () => {
  const form = FORMS.lab;
  const of = (orcid) => {
    const problems = [];
    const values = readValues(form, { ...SAMPLES.lab, orcid }, problems);
    return { problems, orcid: values.orcid };
  };
  // A bare iD and a full address both normalise to the stored form.
  assert.deepEqual(of('0000-0002-1825-0097'), { problems: [], orcid: 'https://orcid.org/0000-0002-1825-0097' });
  assert.deepEqual(of('https://orcid.org/0000-0002-1825-0097').orcid, 'https://orcid.org/0000-0002-1825-0097');
  assert.equal(of('000X-0002-1825-0097').problems.length, 1);
  assert.match(of('000X-0002-1825-0097').problems[0], /ORCID iD/);
  // Empty stays empty rather than becoming a problem: the field is optional.
  assert.deepEqual(of(''), { problems: [], orcid: undefined });
});

// ------------------------------------------------------ fixtures: success

await test('lab fixture produces a YAML entry and a 400x400 WebP photo', async () => {
  const eventFile = await writeEvent('lab', await loadFixture('lab', (p) => p, photoUrl));
  const r = runIntake(eventFile);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.summary, {
    type: 'lab',
    files: ['data/labs/testa-fixture.yml', 'public/photos/testa-fixture.webp'],
    slug: 'testa-fixture',
    title: 'Testa Fixture (FUST)',
  });
  assert.match(r.stderr, /only 64x96 pixels/);

  const text = await readGenerated('data/labs/testa-fixture.yml');
  assert.match(text, /^# Created from issue #101/);
  const data = parseYaml(text);
  assert.equal(data.pi, 'Testa Fixture');
  assert.equal(data.pi_native, '測試 菲克');
  assert.equal(data.institution, 'Fixture University of Science and Technology');
  assert.equal(data.institution_short, 'FUST');
  assert.equal(data.department, 'Department of Test Engineering');
  assert.equal(data.city, 'Shenzhen');
  assert.equal(data.tier, 'member');
  assert.equal(data.website, 'https://example.org/fixture-lab');
  assert.equal(data.scholar, 'https://scholar.google.com/citations?user=FIXTURE0');
  assert.equal(data.photo, 'testa-fixture.webp');
  assert.deepEqual(data.keywords, ['recurrent neural networks', 'working memory', 'decision making']);
  assert.match(data.description, /^A synthetic lab used by scripts\/test-intake\.mjs/);
  assert.equal(String(data.joined), '2026-09-03');
  for (const absent of ['lab', 'email', 'github', 'looking_for', 'draft']) assert.equal(absent in data, false, `${absent} should be absent`);

  const meta = await sharp(path.join(OUT, 'public/photos/testa-fixture.webp')).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 400);
  assert.equal(meta.height, 400);
  assert.equal(meta.exif, undefined);

  const output = await fs.readFile(r.outputFile, 'utf8');
  assert.match(output, /^files=data\/labs\/testa-fixture\.yml public\/photos\/testa-fixture\.webp$/m);
  assert.match(output, /^slug=testa-fixture$/m);
  assert.match(output, /^type=lab$/m);
  assert.match(output, /^title=Testa Fixture \(FUST\)$/m);
  generated.push(...r.summary.files);
});

await test('event fixture produces Markdown with quoted times and the abstract as body', async () => {
  const eventFile = await writeEvent('event', await loadFixture('event'));
  const r = runIntake(eventFile);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.summary.slug, '2027-03-04-testa-fixture');
  assert.deepEqual(r.summary.files, ['data/events/2027-03-04-testa-fixture.md']);
  assert.equal(r.summary.title, 'Fixture seminar: keeping time in cortex');
  assert.equal(r.stderr.trim(), '', 'no warnings expected (host lab exists)');

  const text = await readGenerated('data/events/2027-03-04-testa-fixture.md');
  assert.match(text, /^start: "16:00"$/m);
  assert.match(text, /^end: "17:00"$/m);
  const { data, body } = splitFrontmatter(text);
  assert.equal(data.title, 'Fixture seminar: keeping time in cortex');
  assert.equal(data.type, 'seminar');
  assert.equal(String(data.date), '2027-03-04');
  assert.equal(data.start, '16:00');
  assert.equal(data.end, '17:00');
  assert.equal(data.speaker, 'Testa Fixture');
  assert.equal(data.speaker_native, '測試 菲克');
  assert.equal(data.speaker_url, 'https://example.org/fixture-lab');
  assert.deepEqual(data.junior_speaker, {
    name: 'Wei Fixture',
    affiliation: 'The University of Hong Kong',
    title: 'A normative model of test errors',
  });
  assert.equal(data.host_lab, 'xiangbin-teng');
  assert.equal(data.location, 'Online');
  assert.equal(data.platform, 'Zoom');
  for (const absent of ['end_date', 'host_institution', 'registration_url', 'draft']) assert.equal(absent in data, false, `${absent} should be absent`);
  assert.match(body, /^First paragraph of the abstract/);
  assert.match(body, /\n### Bio\n/);
  assert.match(body, /- another list item\n$/);
  generated.push(...r.summary.files);
});

await test('tutorial fixture produces a YAML entry with a bare DOI', async () => {
  const eventFile = await writeEvent('tutorial', await loadFixture('tutorial'));
  const r = runIntake(eventFile);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.summary.files, ['data/tutorials/fitting-fixture-models-to-choice-data.yml']);
  const data = parseYaml(await readGenerated(r.summary.files[0]));
  assert.equal(data.title, 'Fitting fixture models to choice data');
  assert.deepEqual(data.authors, ['Testa Fixture', 'Wei Fixture']);
  assert.equal(data.lab, 'example-lab');
  assert.equal(data.format, 'notebook');
  assert.equal(data.level, 'introductory');
  assert.equal(data.language, 'English');
  assert.equal(data.url, 'https://github.com/example/fixture-tutorial');
  assert.equal(data.doi, '10.5281/zenodo.0000000');
  assert.deepEqual(data.topics, ['decision making', 'Bayesian inference', 'Python']);
  assert.equal(String(data.added), '2026-09-03');
  generated.push(...r.summary.files);
});

await test('position fixture produces Markdown with frontmatter and body', async () => {
  const eventFile = await writeEvent('position', await loadFixture('position'));
  const r = runIntake(eventFile);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.summary.files, ['data/positions/fixture-postdoc-in-computational-models-of-testing.md']);
  const { data, body } = splitFrontmatter(await readGenerated(r.summary.files[0]));
  assert.equal(data.title, 'Fixture postdoc in computational models of testing');
  assert.equal(data.type, 'postdoc');
  assert.equal(data.lab, 'example-lab');
  assert.equal(data.pi, 'Testa Fixture');
  assert.equal(data.institution, 'Fixture University of Science and Technology');
  assert.equal(data.city, 'Shenzhen');
  assert.equal(data.url, 'https://example.org/fixture-lab/jobs/postdoc');
  assert.equal(data.contact_email, 'testa.fixture@example.org');
  assert.equal(String(data.posted), '2026-09-03');
  assert.equal(String(data.deadline), '2027-06-30');
  assert.equal('expires' in data, false);
  assert.match(body, /^Two or three sentences/);
  assert.match(body, /Apply through the link above\.\n$/);
  generated.push(...r.summary.files);
});

// ------------------------------------------------------ fixtures: failure

const NEG = path.join(OUT, 'negative');

await test('a member lab outside the Greater Bay Area is refused', async () => {
  const payload = await loadFixture(
    'lab',
    (p) => {
      p.issue.body = p.issue.body.replace('### City\r\n\r\nShenzhen', `### City\r\n\r\n${OTHER_CITY}`).replace('### If Other, which city?\r\n\r\n_No response_', '### If Other, which city?\r\n\r\nBeijing');
      return p;
    },
    photoUrl,
  );
  const r = runIntake(await writeEvent('lab-outside-gba', payload), { root: NEG });
  expectFailure(r, /Greater Bay Area city/, /"Beijing" is not one/);
  assert.equal(existsSync(NEG), false, 'nothing may be written on failure');
});

await test('a lab without a photo is accepted and gets no photo field', async () => {
  const NOPHOTO = path.join(OUT, 'no-photo');
  const payload = await loadFixture('lab', (p) => {
    p.issue.body = p.issue.body.replace('![Image](__PHOTO_URL__)', '_No response_');
    return p;
  });
  const r = runIntake(await writeEvent('lab-no-photo', payload), { root: NOPHOTO });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.summary.files, ['data/labs/testa-fixture.yml']);
  const data = parseYaml(await fs.readFile(path.join(NOPHOTO, 'data/labs/testa-fixture.yml'), 'utf8'));
  assert.equal('photo' in data, false, 'photo should be absent');
  assert.equal(existsSync(path.join(NOPHOTO, 'public')), false, 'no photo directory should be created');
});

await test('text without an image in the photo field is refused with a helpful message', async () => {
  const payload = await loadFixture('lab', (p) => {
    p.issue.body = p.issue.body.replace('![Image](__PHOTO_URL__)', 'I will send one later');
    return p;
  });
  const r = runIntake(await writeEvent('lab-text-photo', payload), { root: NEG });
  expectFailure(r, /No image was found in "PI photo"/, /or leave the field empty/);
  assert.equal(existsSync(NEG), false);
});

await test('a photo that is not a GitHub attachment is refused', async () => {
  const payload = await loadFixture('lab', (p) => p, 'https://example.org/not-github.png');
  const r = runIntake(await writeEvent('lab-foreign-photo', payload), { root: NEG });
  expectFailure(r, /a link to example\.org is not accepted/);
  const local = await loadFixture('lab', (p) => p, photoUrl);
  const r2 = runIntake(await writeEvent('lab-file-url-disallowed', local), { root: NEG, allowFile: false });
  expectFailure(r2, /No photo was found|not linked as a local file/);
  assert.equal(existsSync(NEG), false);
});

await test('several problems are reported together', async () => {
  const payload = await loadFixture('event', (p) => {
    p.issue.body = p.issue.body
      .replace('### Date (YYYY-MM-DD)\r\n\r\n2027-03-04', '### Date (YYYY-MM-DD)\r\n\r\n2027-13-40')
      .replace('### Speaker web page\r\n\r\nhttps://example.org/fixture-lab', '### Speaker web page\r\n\r\nexample.org/fixture-lab')
      .replace('- [X] The speaker has agreed', '- [ ] The speaker has agreed')
      .replace('First paragraph of the abstract', 'Join at https://zoom.us/j/1234567890 passcode: 1234. First paragraph of the abstract');
    return p;
  });
  const r = runIntake(await writeEvent('event-bad', payload), { root: NEG });
  expectFailure(r, /YYYY-MM-DD/, /https:\/\/ or http:\/\//, /Tick the box "The speaker has agreed to be listed publicly"/, /meeting link or passcode/);
  // An invalid date must not also produce a spurious "end date is before the date".
  assert.doesNotMatch(r.stderr, /end date is before/);
  assert.equal(existsSync(NEG), false);
});

await test('consent boxes are matched by label, not position', async () => {
  const payload = await loadFixture(
    'lab',
    (p) => {
      // The author edits the generated body and ticks two unrelated lines instead.
      p.issue.body = p.issue.body.replace(/- \[X\] [^\r\n]+/g, '- [X] something else entirely');
      return p;
    },
    photoUrl,
  );
  const r = runIntake(await writeEvent('lab-consent-tamper', payload), { root: NEG });
  expectFailure(r, /Tick the box "I consent to the publication/, /Tick the box "I have read the privacy and consent statement/);
  assert.equal(existsSync(NEG), false);
});

await test('a meeting link in the speaker web page field is refused', async () => {
  const payload = await loadFixture('event', (p) => {
    p.issue.body = p.issue.body.replace(
      '### Speaker web page\r\n\r\nhttps://example.org/fixture-lab',
      '### Speaker web page\r\n\r\nhttps://zoom.us/j/1234567890',
    );
    return p;
  });
  const r = runIntake(await writeEvent('event-zoom-speaker-url', payload), { root: NEG });
  expectFailure(r, /meeting link or passcode/);
  assert.equal(existsSync(NEG), false);
});

await test('crossChecks and the intake script report the same problems', async () => {
  const payload = await loadFixture('event', (p) => {
    p.issue.body = p.issue.body
      .replace('### End time (HH:MM, Hong Kong Time)\r\n\r\n17:00', '### End time (HH:MM, Hong Kong Time)\r\n\r\n15:00')
      .replace('### Junior speaker name\r\n\r\nWei Fixture', '### Junior speaker name\r\n\r\n_No response_')
      .replace('### Location\r\n\r\nOnline', '### Location\r\n\r\nhttps://zoom.us/j/1234567890');
    return p;
  });
  // The door: what the worker would say about this body before filing anything.
  const expected = [];
  const values = readFields(FORMS.event, payload.issue.body, expected);
  assert.deepEqual(expected, [], 'no field of this body is wrong on its own');
  crossChecks('event', values, expected);
  assert.equal(expected.length, 3, expected.join(' | '));

  // The workflow: what the intake script says about the same body.
  const r = runIntake(await writeEvent('event-cross-checks', payload), { root: NEG });
  assert.notEqual(r.status, 0, r.stdout);
  const reported = r.stderr.split('\n').filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
  assert.deepEqual(reported, expected, 'the two doors must report the same problems in the same order');
  assert.equal(existsSync(NEG), false);
});

await test('nominations and unrelated issues exit 0 without files', async () => {
  const nomination = {
    action: 'opened',
    issue: { number: 7, title: '[Speaker] Someone', body: '### Nominee\n\nSomeone\n', labels: [{ name: 'speaker-nomination' }], created_at: '2026-09-03T02:15:00Z' },
  };
  const r = runIntake(await writeEvent('nomination', nomination), { root: NEG });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no data file is created/i);
  const other = { action: 'opened', issue: { number: 8, title: 'The site is down', body: 'help', labels: [], created_at: '2026-09-03T02:15:00Z' } };
  const r2 = runIntake(await writeEvent('other', other), { root: NEG });
  assert.equal(r2.status, 0, r2.stderr);
  assert.match(r2.stdout, /nothing to do/);
  assert.equal(existsSync(NEG), false);
  assert.equal(existsSync(r.outputFile), false, 'no GITHUB_OUTPUT lines when there is nothing to do');
});

// ------------------------------------------- validation build with Astro

const astroBin = path.join(REPO_ROOT, 'node_modules', '.bin', 'astro');
if (failed === 0 && existsSync(astroBin)) {
  await test('the generated files pass the Astro content schemas', async () => {
    const copied = [];
    try {
      for (const rel of generated) {
        const src = path.join(OUT, rel);
        const dest = path.join(REPO_ROOT, rel);
        assert.equal(existsSync(dest), false, `refusing to overwrite ${rel}`);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
        copied.push(dest);
      }
      const r = spawnSync(process.execPath, [astroBin, 'build', '--outDir', '.intake/dist-check'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      });
      assert.equal(r.status, 0, `astro build failed:\n${r.stdout}\n${r.stderr}`);
      const dist = path.join(REPO_ROOT, '.intake', 'dist-check');
      assert.ok(existsSync(path.join(dist, 'events', '2027-03-04-testa-fixture', 'index.html')), 'event page built');
      assert.ok(existsSync(path.join(dist, 'events', '2027-03-04-testa-fixture', 'poster', 'index.html')), 'poster page built');
      assert.ok(existsSync(path.join(dist, 'photos', 'testa-fixture.webp')), 'photo copied to dist');
      const labs = await fs.readFile(path.join(dist, 'labs', 'index.html'), 'utf8');
      assert.match(labs, /Testa Fixture/);

      // While the generated lab file exists on "main": a different issue with
      // the same PI name must not overwrite it, but the same issue may regenerate it.
      const clash = runIntake(
        await writeEvent('lab-clash', await loadFixture('lab', (p) => ((p.issue.number = 999), p), photoUrl)),
        { root: path.join(OUT, 'clash') },
      );
      assert.equal(clash.status, 0, clash.stderr);
      assert.deepEqual(clash.summary.files, ['data/labs/testa-fixture-999.yml', 'public/photos/testa-fixture-999.webp']);
      assert.match(clash.stderr, /already exists on main and was not created from this issue/);
      assert.equal(parseYaml(await fs.readFile(path.join(OUT, 'clash', 'data/labs/testa-fixture-999.yml'), 'utf8')).photo, 'testa-fixture-999.webp');
      const again = runIntake(await writeEvent('lab-again', await loadFixture('lab', (p) => p, photoUrl)), { root: path.join(OUT, 'again') });
      assert.equal(again.status, 0, again.stderr);
      assert.deepEqual(again.summary.files, ['data/labs/testa-fixture.yml', 'public/photos/testa-fixture.webp']);
    } finally {
      for (const dest of copied) await fs.rm(dest, { force: true });
    }
  });
} else if (!existsSync(astroBin)) {
  console.log('# skipped the Astro validation build: node_modules/.bin/astro not found');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
