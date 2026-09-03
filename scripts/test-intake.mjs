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
import { DATA_TYPES, FORMS, OTHER_CITY, detectType } from './lib/forms.mjs';
import { parseCheckboxes, parseIssueForm } from './lib/issue-form.mjs';
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

await test('slugify and findImageUrl', () => {
  assert.equal(slugify('Jörg Müller-Lüdenscheidt'), 'jorg-muller-ludenscheidt');
  assert.equal(slugify('  Jane   Doe, PhD. '), 'jane-doe-phd');
  assert.equal(slugify('滕相斌'), '');
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
  expectFailure(r, /YYYY-MM-DD/, /https:\/\/ address/, /Tick the box "The speaker has agreed to be listed publicly"/, /meeting link or passcode/);
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
    } finally {
      for (const dest of copied) await fs.rm(dest, { force: true });
    }
  });
} else if (!existsSync(astroBin)) {
  console.log('# skipped the Astro validation build: node_modules/.bin/astro not found');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
