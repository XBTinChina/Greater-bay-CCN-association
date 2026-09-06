#!/usr/bin/env node
// Tests for the submit endpoint. No network and no real credentials: the
// GitHub API and Turnstile are stubbed on globalThis.fetch, and the RSA key
// pair is generated here at start-up and thrown away when the process exits.
//
//   node workers/submit/test.mjs

import assert from 'node:assert/strict';
import { CONSENT_PRIVACY, CONSENT_PUBLISH, FORMS, OTHER_CITY } from '../../scripts/lib/forms.mjs';
import { parseIssueForm } from '../../scripts/lib/issue-form.mjs';
import { readFields, readValues } from '../../scripts/lib/validate.mjs';
import worker, { clearTokenCache, issueLabels, issueTitle, renderIssueBody } from './index.mjs';

/** The values the worker validates for a payload, for comparing against what it filed. */
function validated(form, fields) {
  const problems = [];
  const values = readValues(form, fields, problems);
  assert.deepEqual(problems, [], 'the fixture itself must validate');
  return values;
}

// The worker logs one JSON line per request. They are collected rather than
// printed, both to keep this output readable and so that the last test can
// prove that no field value or secret was ever written to them.
const logged = [];
const realLog = console.log;
console.log = (...args) => {
  if (args.length === 1 && typeof args[0] === 'string' && args[0].startsWith('{')) logged.push(args[0]);
  else realLog(...args);
};

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

// ------------------------------------------------------------- a throwaway key

const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);

function pem(label, der) {
  const bytes = new Uint8Array(der);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary).replace(/(.{64})/g, '$1\n').replace(/\n$/, '');
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----\n`;
}

const PKCS8_DER = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
const PKCS8_PEM = pem('PRIVATE KEY', PKCS8_DER);

/** Read the PKCS#1 key back out of the PKCS#8 envelope, to test that path too. */
function unwrapPkcs8(der) {
  let at = 0;
  const skipHeader = () => {
    at += 1; // the tag
    const first = der[at++];
    if (first & 0x80) at += first & 0x7f;
  };
  const skipValue = () => {
    at += 1;
    const first = der[at++];
    let length = first;
    if (first & 0x80) {
      const count = first & 0x7f;
      length = 0;
      for (let i = 0; i < count; i += 1) length = length * 256 + der[at++];
    }
    at += length;
  };
  skipHeader(); // the outer SEQUENCE
  skipValue(); // version
  skipValue(); // the algorithm identifier
  at += 1; // the OCTET STRING tag
  const first = der[at++];
  let length = first;
  if (first & 0x80) {
    const count = first & 0x7f;
    length = 0;
    for (let i = 0; i < count; i += 1) length = length * 256 + der[at++];
  }
  return der.slice(at, at + length);
}

const PKCS1_PEM = pem('RSA PRIVATE KEY', unwrapPkcs8(PKCS8_DER));

// --------------------------------------------------------------- the stubs

const ORIGIN = 'https://xbtinchina.github.io';
const APP_TOKEN = 'ghs_stub_installation_token';
const TURNSTILE_SECRET = 'stub-turnstile-secret';

function baseEnv(extra = {}) {
  return {
    GITHUB_APP_ID: '123456',
    GITHUB_APP_PRIVATE_KEY: PKCS8_PEM,
    GITHUB_INSTALLATION_ID: '7654321',
    GITHUB_OWNER: 'XBTinChina',
    GITHUB_REPO: 'Great-bay-CCN-association',
    ALLOWED_ORIGIN: `${ORIGIN}, https://mirror.example.org`,
    ...extra,
  };
}

const realFetch = globalThis.fetch;
let calls = [];

/** Records every outbound call and answers as GitHub and Turnstile would. */
function stubFetch({ turnstile = true, issueStatus = 201 } = {}) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    const body = init.body ? String(init.body) : '';
    calls.push({ url: target, method: init.method ?? 'GET', headers: init.headers ?? {}, body });
    if (target === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      return new Response(JSON.stringify({ success: turnstile }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (/\/app\/installations\/\d+\/access_tokens$/.test(target)) {
      return new Response(JSON.stringify({ token: APP_TOKEN, expires_at: new Date(Date.now() + 3_600_000).toISOString() }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (/\/issues\/\d+\/comments$/.test(target)) {
      return new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (/\/issues$/.test(target)) {
      if (issueStatus >= 400) return new Response('{"message":"nope"}', { status: issueStatus, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify({ number: 42, html_url: 'https://github.com/XBTinChina/Great-bay-CCN-association/issues/42' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`the test made an unexpected request to ${target}`);
  };
}

const posted = (pattern) => calls.filter((c) => c.method === 'POST' && pattern.test(c.url));

// Every response body the tests see, checked at the end for leaked secrets.
const seen = [];
async function send(payload, { env = baseEnv(), origin = ORIGIN, headers = {}, ctx = {}, raw = null } = {}) {
  // An explicit undefined removes a default header, for the cases that test
  // what happens when the runtime tells the worker no address at all.
  const merged = { 'content-type': 'application/json', ...(origin ? { origin } : {}), 'cf-connecting-ip': '203.0.113.7', ...headers };
  for (const [name, value] of Object.entries(merged)) if (value === undefined) delete merged[name];
  const init = { method: 'POST', headers: merged, body: raw ?? JSON.stringify(payload) };
  const response = await worker.fetch(new Request('https://forms.example.org/', init), env, ctx);
  const text = await response.text();
  seen.push(text);
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  return { response, data, text };
}

// --------------------------------------------------------- a valid submission

const LAB_FIELDS = {
  pi: 'Ada Lovelace',
  pi_native: '',
  lab: 'Analytical Engine Lab',
  institution: 'University of Hong Kong',
  institution_short: 'HKU',
  department: 'Department of Psychology',
  city: 'Hong Kong',
  city_other: '',
  tier: 'member',
  website: 'https://example.org/lab',
  email: 'ada@example.org',
  scholar: '',
  github: '',
  orcid: '',
  profile: '',
  keywords: 'computation, cognition, learning',
  description: 'We study how people compute, with models and behaviour.\nTwo lines are fine here.',
  looking_for: 'PhD students',
  photo: '',
  consent: [CONSENT_PUBLISH, CONSENT_PRIVACY],
};

const labPayload = (fields = {}) => ({ type: 'lab', trap: '', elapsed: 20_000, fields: { ...LAB_FIELDS, ...fields } });

// ------------------------------------------------------------------- tests

await test('OPTIONS preflight answers the allowed origin, never *', async () => {
  stubFetch();
  const response = await worker.fetch(
    new Request('https://forms.example.org/', { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } }),
    baseEnv(),
    {},
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(response.headers.get('vary'), 'Origin');
  assert.match(response.headers.get('access-control-allow-methods') ?? '', /POST/);
  assert.equal(calls.length, 0);
});

await test('an origin outside the allowlist is refused', async () => {
  stubFetch();
  const options = await worker.fetch(new Request('https://forms.example.org/', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), baseEnv(), {});
  assert.equal(options.status, 403);
  assert.equal(options.headers.get('access-control-allow-origin'), null);

  const { response, data } = await send(labPayload(), { origin: 'https://evil.example' });
  assert.equal(response.status, 403);
  assert.equal(data.ok, false);
  assert.ok(Array.isArray(data.problems) && data.problems.length);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(calls.length, 0, 'nothing is filed for a foreign origin');
});

await test('a post with no Origin header is refused', async () => {
  stubFetch();
  const { response } = await send(labPayload(), { origin: '' });
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

await test('a second allowed origin in the list also passes', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send(labPayload(), { origin: 'https://mirror.example.org' });
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://mirror.example.org');
});

await test('the honeypot is discarded and looks like a success', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send({ ...labPayload(), trap: 'http://spam.example' });
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(calls.length, 0, 'no issue is created for a filled honeypot');
});

await test('a submission faster than three seconds is discarded', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send({ ...labPayload(), elapsed: 900 });
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(calls.length, 0);

  const missing = await send({ ...labPayload(), elapsed: undefined });
  assert.equal(missing.response.status, 200);
  assert.equal(missing.data.ok, true);
  assert.equal(calls.length, 0);
});

await test('an unknown type is refused', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send({ ...labPayload(), type: 'constructor' });
  assert.equal(response.status, 400);
  assert.equal(data.ok, false);
  assert.ok(data.problems[0].length > 0);
  assert.equal(calls.length, 0);
});

await test('a body that is not JSON is refused', async () => {
  stubFetch();
  const { response } = await send(null, { raw: 'not json at all' });
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

await test('a body over the cap is refused', async () => {
  stubFetch();
  const big = JSON.stringify({ ...labPayload(), fields: { ...LAB_FIELDS, description: 'x'.repeat(70_000) } });
  const { response, data } = await send(null, { raw: big });
  assert.equal(response.status, 400);
  assert.match(data.problems.join(' '), /larger than this form accepts/);
  assert.equal(calls.length, 0);
});

await test('a missing required field comes back as a readable problem', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send(labPayload({ institution: '', keywords: '' }));
  assert.equal(response.status, 400);
  assert.equal(data.ok, false);
  assert.ok(data.problems.includes('"Institution" is required.'), JSON.stringify(data.problems));
  assert.ok(data.problems.some((p) => p.startsWith('"Research keywords')));
  assert.equal(calls.length, 0, 'nothing is filed when the entry does not validate');
});

await test('an unticked consent box is a problem, not a silent pass', async () => {
  stubFetch();
  const { response, data } = await send(labPayload({ consent: [CONSENT_PUBLISH] }));
  assert.equal(response.status, 400);
  assert.ok(data.problems.some((p) => p.startsWith('Tick the box')), JSON.stringify(data.problems));
});

await test('a lab submission is filed, and the issue body round-trips', async () => {
  stubFetch();
  clearTokenCache();
  const payload = labPayload();
  const { response, data } = await send(payload);
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.deepEqual(data, { ok: true, issue: 'https://github.com/XBTinChina/Great-bay-CCN-association/issues/42', number: 42 });

  const issues = posted(/\/repos\/XBTinChina\/Great-bay-CCN-association\/issues$/);
  assert.equal(issues.length, 1);
  const sent = JSON.parse(issues[0].body);
  assert.equal(sent.title, '[Lab] Ada Lovelace');
  assert.deepEqual(sent.labels, ['intake', 'intake:lab']);

  // The body is what this worker renders from the values it validated, and
  // what it renders reads back as those same values: the two doors cannot
  // drift apart. The description was sent over two lines and is filed as one,
  // because that is the value a `sentence` field holds once validated.
  assert.equal(sent.body, renderIssueBody(FORMS.lab, validated(FORMS.lab, payload.fields)));
  assert.match(sent.body, /### Description \(one or two sentences, max 700 characters\)\n\nWe study how people compute, with models and behaviour\. Two lines are fine here\.\n\n/);
  assert.ok(sent.body.startsWith('### PI name (Latin script)\n\nAda Lovelace\n\n'));
  assert.match(sent.body, /### PI name \(native script\)\n\n_No response_\n\n/);
  assert.match(sent.body, /- \[X\] I consent to the publication/);
  assert.match(sent.body, /### PI photo\n\n_No response_\n\n/);

  const parsed = parseIssueForm(sent.body, FORMS.lab.fields.map((f) => f.label));
  assert.equal(parsed.get('Institution'), 'University of Hong Kong');
  assert.equal(parsed.get('PI name (native script)'), '');

  const fromBody = [];
  const fromPayload = [];
  assert.deepEqual(readFields(FORMS.lab, sent.body, fromBody), readValues(FORMS.lab, payload.fields, fromPayload));
  assert.deepEqual(fromBody, []);
  assert.deepEqual(fromPayload, []);
});

// ------------------------------------------------- what must never be filed
//
// The intake parser resolves each known label to its last occurrence, so a
// value carrying a line "### <a label on this form>" would move text from one
// field into another and the intake would write something the worker never
// validated. Three layers stop that: the value that goes into the body is the
// normalised one, a line repeating a label is refused by name, and the body is
// parsed back and compared before anything is filed.

const TUTORIAL_FIELDS = {
  title: 'A gentle introduction to drift diffusion',
  authors: 'Ada Lovelace, Grace Hopper',
  lab: '',
  format: 'notebook',
  level: 'introductory',
  language: 'English',
  url: 'https://example.org/tutorial',
  doi: '',
  topics: 'real-topic',
  description: 'A short walk through the model.',
  consent: ["The material is openly accessible at the link and I am an author or have the authors' permission"],
};

const tutorialPayload = (fields = {}) => ({ type: 'tutorial', trap: '', elapsed: 20_000, fields: { ...TUTORIAL_FIELDS, ...fields } });

const EVENT_FIELDS = {
  title: 'Predictive coding in the auditory system',
  type: 'seminar',
  date: '2030-05-04',
  end_date: '',
  start: '16:00',
  end: '17:00',
  speaker: 'Grace Hopper',
  speaker_native: '',
  speaker_affiliation: 'Yale',
  speaker_url: '',
  junior_name: '',
  junior_affiliation: '',
  junior_title: '',
  host_lab: '',
  host_institution: 'HKU',
  location: 'Online',
  platform: 'Zoom',
  registration_url: '',
  abstract: 'We will discuss prediction errors and their time course.',
  consent: ['The speaker has agreed to be listed publicly'],
};

const eventPayload = (fields = {}) => ({ type: 'event', trap: '', elapsed: 20_000, fields: { ...EVENT_FIELDS, ...fields } });

await test('a heading that repeats a field label is refused, and nothing is filed', async () => {
  stubFetch();
  clearTokenCache();
  const description = 'HEAD\n### Description (max 700 characters)\nTAIL';
  const { response, data } = await send(tutorialPayload({ description }));
  assert.equal(response.status, 400);
  assert.equal(data.ok, false);
  assert.equal(calls.length, 0, 'no issue is created for an injected heading');
  const message = data.problems.join(' ');
  assert.match(message, /"Description \(max 700 characters\)"/, message);
  assert.match(message, /would be read as the start of another field/, message);

  // What the refusal prevents. Had that value been written into the body, the
  // intake would have read a different submission from the one validated here.
  const values = validated(FORMS.tutorial, TUTORIAL_FIELDS);
  const injected = renderIssueBody(FORMS.tutorial, values).replace(
    `### Description (max 700 characters)\n\n${values.description}\n\n`,
    `### Description (max 700 characters)\n\n${description}\n\n`,
  );
  const readBack = readFields(FORMS.tutorial, injected, []);
  assert.notDeepEqual(readBack.topics, values.topics, 'the injected heading really does move text between fields');
  assert.ok(readBack.topics.length > 1);
});

await test('the whole run of headings from the position attack is refused', async () => {
  stubFetch();
  clearTokenCache();
  const body = [
    'A perfectly ordinary job advert.',
    '',
    '### Link to the full advertisement',
    '',
    'https://evil.example/apply',
    '',
    '### Contact email',
    '',
    'attacker@evil.example',
    '',
    '### Description (Markdown)',
    '',
    'Apply at https://evil.example/apply',
  ].join('\n');
  const { response, data } = await send({
    type: 'position',
    trap: '',
    elapsed: 20_000,
    fields: {
      title: 'Postdoc in computational cognition',
      type: 'postdoc',
      lab: '',
      pi: '',
      institution: 'HKU',
      city: 'Hong Kong',
      url: 'https://hku.hk/jobs/1',
      contact_email: 'real@example.org',
      deadline: '',
      expires: '',
      body,
    },
  });
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
  assert.equal(data.problems.length, 3, JSON.stringify(data.problems));
  for (const problem of data.problems) assert.match(problem, /^"Description \(Markdown\)" contains the line "### /);
});

await test('a one-line field that repeats a label is refused too', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send(labPayload({ pi: 'Ada Lovelace\n### Institution\n\nBogus Person' }));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
  assert.match(data.problems.join(' '), /"PI name \(Latin script\)" contains the line "### Institution"/, JSON.stringify(data.problems));
});

await test('a heading that is not a label in a one-line field is collapsed and filed as validated', async () => {
  stubFetch();
  clearTokenCache();
  const payload = labPayload({ pi: 'Ada Lovelace\n### Notes\nof Nottingham' });
  const { response, data } = await send(payload);
  // A text field is collapsed to one line before it is written, so nothing in
  // it can start a line in the body at all.
  assert.equal(response.status, 200, JSON.stringify(data));
  const sent = JSON.parse(posted(/\/issues$/)[0].body);
  const values = validated(FORMS.lab, payload.fields);
  assert.equal(values.pi, 'Ada Lovelace ### Notes of Nottingham');
  assert.equal(sent.title, '[Lab] Ada Lovelace ### Notes of Nottingham');
  assert.match(sent.body, /### PI name \(Latin script\)\n\nAda Lovelace ### Notes of Nottingham\n\n/);
  assert.deepEqual(readFields(FORMS.lab, sent.body, []), values, 'the body still reads back as the values that were validated');
});

await test('an ordinary Markdown heading in an abstract is accepted and round-trips exactly', async () => {
  stubFetch();
  clearTokenCache();
  const abstract = 'Some background.\n\n### Methods\n\nA drift diffusion model.\n\n### Results\n\nIt fits.';
  const payload = eventPayload({ abstract });
  const { response, data } = await send(payload);
  assert.equal(response.status, 200, JSON.stringify(data));
  const sent = JSON.parse(posted(/\/issues$/)[0].body);
  assert.ok(sent.body.includes(abstract), 'the abstract is filed verbatim, headings and all');
  const values = validated(FORMS.event, payload.fields);
  const echo = [];
  assert.deepEqual(readFields(FORMS.event, sent.body, echo), values);
  assert.deepEqual(echo, []);
  assert.equal(readFields(FORMS.event, sent.body, []).abstract, abstract);
});

await test('every filed body reads back as the values that were validated', async () => {
  stubFetch();
  clearTokenCache();
  // Awkward but legitimate values: normalisation, headings that are not
  // labels, the sentinel inside a longer text, an indented heading, an emoji.
  const cases = [
    ['lab', labPayload({ keywords: 'computation, computation, learning', orcid: '0000-0002-1825-0097' })],
    ['lab', labPayload({ pi: 'Ada Lovelace 🧠', looking_for: 'PhD students; postdocs' })],
    ['event', eventPayload({ date: '2030/05/04', start: '4:30', end: '17:00', end_date: '2030-05-05' })],
    ['event', eventPayload({ abstract: 'Nothing here says _No response_ on its own.\n\n    ### An indented heading\n\n# A title\n\nEnd.' })],
    ['tutorial', tutorialPayload({ doi: 'https://doi.org/10.5281/zenodo.1234567', lab: 'HKU-Lab.yml' })],
    ['nomination', { type: 'nomination', trap: '', elapsed: 9000, fields: { name: 'Grace Hopper', affiliation: 'Yale', url: '', why: 'Compilers.', suggested_host: '', willing_to_host: ['I am willing to host this talk'], note: '' } }],
  ];
  for (const [type, payload] of cases) {
    calls = [];
    const { response, data } = await send(payload);
    assert.equal(response.status, 200, `${type}: ${JSON.stringify(data)}`);
    const sent = JSON.parse(posted(/\/issues$/)[0].body);
    const echo = [];
    assert.deepEqual(readFields(FORMS[type], sent.body, echo), validated(FORMS[type], payload.fields), type);
    assert.deepEqual(echo, [], type);
  }
});

await test('the words "_No response_" as a value are refused with a message about them', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send(eventPayload({ abstract: '_No response_' }));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
  assert.match(data.problems.join(' '), /"Abstract \(Markdown\)" cannot be the words "_No response_"/, JSON.stringify(data.problems));
});

await test('a meeting link in an abstract never reaches the GitHub API', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send(eventPayload({ abstract: 'Join us at https://zoom.us/j/1234567890 passcode: 4242.' }));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0, 'nothing was sent to GitHub');
  assert.match(data.problems.join(' '), /meeting link or passcode/, JSON.stringify(data.problems));
  assert.ok(!seen.at(-1).includes('4242'), 'the passcode is not echoed back either');
});

await test('the cross-field rules run at the door, not after the issue exists', async () => {
  stubFetch();
  clearTokenCache();

  const other = await send(labPayload({ city: OTHER_CITY, city_other: '' }));
  assert.equal(other.response.status, 400);
  assert.match(other.data.problems.join(' '), /You chose "Other" as the city/);

  const outside = await send(labPayload({ city: OTHER_CITY, city_other: 'Beijing', tier: 'member' }));
  assert.equal(outside.response.status, 400);
  assert.match(outside.data.problems.join(' '), /Member labs must be in a Greater Bay Area city/);

  const backwards = await send(eventPayload({ start: '17:00', end: '16:00', junior_affiliation: 'HKU' }));
  assert.equal(backwards.response.status, 400);
  assert.match(backwards.data.problems.join(' '), /end time must be after the start time/);
  assert.match(backwards.data.problems.join(' '), /junior speaker name/);

  const past = await send({
    type: 'position',
    trap: '',
    elapsed: 20_000,
    fields: {
      title: 'Postdoc',
      type: 'postdoc',
      lab: '',
      pi: '',
      institution: 'HKU',
      city: 'Hong Kong',
      url: '',
      contact_email: '',
      deadline: '2020-01-01',
      expires: '',
      body: 'Come and work with us.',
    },
  });
  assert.equal(past.response.status, 400);
  assert.match(past.data.problems.join(' '), /deadline \(2020-01-01\) is already past/);

  assert.equal(calls.length, 0, 'not one of these reached GitHub');
});

await test('a photo field is refused at the endpoint, not only left off the page', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send(labPayload({ photo: 'https://github.com/user-attachments/assets/deadbeef' }));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
  assert.match(data.problems.join(' '), /"PI photo" cannot be sent through the web form/, JSON.stringify(data.problems));

  // The empty string the page sends for that field is not a value.
  const empty = await send(labPayload({ photo: '' }));
  assert.equal(empty.response.status, 200);
  const sent = JSON.parse(posted(/\/issues$/)[0].body);
  assert.match(sent.body, /### PI photo\n\n_No response_\n\n/);
});

await test('a "__proto__" key in the payload pollutes nothing and carries no value', async () => {
  stubFetch();
  clearTokenCache();
  // Written out by hand: an object literal with a __proto__ key would set the
  // prototype here rather than send the key.
  const raw = `{"type":"lab","trap":"","elapsed":20000,"fields":{"__proto__":{"pi":"Eve","institution":"Nowhere","polluted":"yes"},"constructor":{"pi":"Mallory"}}}`;
  const { response, data } = await send(null, { raw });
  assert.equal(response.status, 400, JSON.stringify(data));
  assert.equal(calls.length, 0);
  assert.ok(data.problems.includes('"PI name (Latin script)" is required.'), JSON.stringify(data.problems));
  assert.equal({}.polluted, undefined, 'Object.prototype was not touched');
  assert.equal(Object.prototype.pi, undefined);
  assert.equal([].pi, undefined);
});

await test('the note about the web form is a separate comment, not part of the body', async () => {
  stubFetch();
  clearTokenCache();
  await send(labPayload());
  const issue = JSON.parse(posted(/\/issues$/)[0].body);
  assert.ok(!/web form/i.test(issue.body), 'the body carries fields only');
  assert.ok(issue.body.endsWith('\n\n'));

  const comments = posted(/\/issues\/42\/comments$/);
  assert.equal(comments.length, 1);
  const note = JSON.parse(comments[0].body).body;
  assert.match(note, /web form/i);
  assert.match(note, /photo can be added later/i);
});

await test('a nomination gets its own label and title', async () => {
  stubFetch();
  clearTokenCache();
  const payload = {
    type: 'nomination',
    trap: '',
    elapsed: 9000,
    fields: { name: 'Grace Hopper', affiliation: 'Yale', url: '', why: 'Foundational work on compilers.', suggested_host: '', willing_to_host: [], note: '' },
  };
  const { response, data } = await send(payload);
  assert.equal(response.status, 200, JSON.stringify(data));
  const sent = JSON.parse(posted(/\/issues$/)[0].body);
  assert.equal(sent.title, '[Speaker] Grace Hopper');
  assert.deepEqual(sent.labels, ['speaker-nomination']);
  assert.match(sent.body, /- \[ \] I am willing to host this talk/);
  assert.deepEqual(issueLabels(FORMS.nomination), ['speaker-nomination']);
});

await test('the title is collapsed and capped at 120 characters', async () => {
  const long = issueTitle(FORMS.event, { title: `${'Very long title '.repeat(20)}end` });
  assert.ok(long.length <= 120, `title is ${long.length} characters`);
  assert.ok(long.startsWith('[Event] Very long title'));
  assert.equal(issueTitle(FORMS.lab, { pi: '  Ada\n  Lovelace  ' }), '[Lab] Ada Lovelace');
});

await test('the title is cut on code points, so no emoji is halved', async () => {
  // The 120th code point is the emoji; cutting UTF-16 units would leave half of it.
  const cut = issueTitle(FORMS.event, { title: `${'a'.repeat(111)}\u{1F9E0}x` });
  assert.equal(Array.from(cut).length, 120);
  assert.equal(cut, `[Event] ${'a'.repeat(111)}\u{1F9E0}`);
  assert.ok(!/\p{Surrogate}/u.test(cut), 'no half of a pair is left in the title');
  assert.ok(/\p{Surrogate}/u.test(`[Event] ${'a'.repeat(111)}\u{1F9E0}x`.slice(0, 120)), 'which is what slicing units would have done');
});

await test('the JWT is RS256, names the App and verifies against the key', async () => {
  stubFetch();
  clearTokenCache();
  await send(labPayload());
  const mint = posted(/\/access_tokens$/);
  assert.equal(mint.length, 1);
  const jwt = String(mint[0].headers.authorization ?? '').replace(/^Bearer /, '');
  const [head, claims, signature] = jwt.split('.');
  const decode = (part) => JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.deepEqual(decode(head), { alg: 'RS256', typ: 'JWT' });
  const payload = decode(claims);
  assert.equal(payload.iss, '123456');
  assert.ok(payload.exp - payload.iat <= 600, 'the JWT lives at most ten minutes');
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    pair.publicKey,
    Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
    new TextEncoder().encode(`${head}.${claims}`),
  );
  assert.ok(ok, 'the signature verifies against the App key');

  // The issue itself is created with the installation token, not the JWT.
  assert.equal(posted(/\/issues$/)[0].headers.authorization, `Bearer ${APP_TOKEN}`);
});

await test('the installation token is minted once and reused', async () => {
  stubFetch();
  clearTokenCache();
  await send(labPayload());
  await send(labPayload());
  assert.equal(posted(/\/access_tokens$/).length, 1, 'the cached token is reused');
  assert.equal(posted(/\/issues$/).length, 2);
});

await test('a private key with literal \\n escapes is accepted', async () => {
  stubFetch();
  clearTokenCache();
  const escaped = PKCS8_PEM.replace(/\n/g, '\\n');
  const { response, data } = await send(labPayload(), { env: baseEnv({ GITHUB_APP_PRIVATE_KEY: escaped }) });
  assert.equal(response.status, 200, JSON.stringify(data));
});

await test('a PKCS#1 private key, as GitHub hands it out, is accepted', async () => {
  stubFetch();
  clearTokenCache();
  const { response, data } = await send(labPayload(), { env: baseEnv({ GITHUB_APP_PRIVATE_KEY: PKCS1_PEM }) });
  assert.equal(response.status, 200, JSON.stringify(data));
});

await test('Turnstile is checked only when the secret is set', async () => {
  stubFetch({ turnstile: true });
  clearTokenCache();
  await send(labPayload());
  assert.equal(posted(/siteverify$/).length, 0, 'no check without a secret');

  stubFetch({ turnstile: true });
  clearTokenCache();
  const good = await send({ ...labPayload(), turnstile: 'a-token' }, { env: baseEnv({ TURNSTILE_SECRET }) });
  assert.equal(good.response.status, 200, good.text);
  assert.equal(posted(/siteverify$/).length, 1);

  stubFetch({ turnstile: false });
  clearTokenCache();
  const bad = await send({ ...labPayload(), turnstile: 'a-token' }, { env: baseEnv({ TURNSTILE_SECRET }) });
  assert.equal(bad.response.status, 400);
  assert.match(bad.data.problems.join(' '), /anti-spam check/);
  assert.equal(posted(/\/issues$/).length, 0);
});

/** A KV stub that records how it was read, so the cacheTtl can be asserted. */
function kvStub() {
  const store = new Map();
  const reads = [];
  return {
    store,
    reads,
    binding: {
      get: async (key, options) => {
        reads.push({ key, options });
        return store.get(key) ?? null;
      },
      put: async (key, value) => void store.set(key, value),
    },
  };
}

/** A stub of Cloudflare's rate-limiting binding: atomic, and counts every call. */
function limiterStub(limit) {
  const seenKeys = [];
  return {
    seenKeys,
    binding: {
      limit: async ({ key }) => {
        seenKeys.push(key);
        return { success: seenKeys.filter((k) => k === key).length <= limit };
      },
    },
  };
}

await test('the native rate-limit binding is used first and its refusal is a 429', async () => {
  stubFetch();
  clearTokenCache();
  const limiter = limiterStub(2);
  const env = baseEnv({ RATE_LIMITER: limiter.binding });
  assert.equal((await send(labPayload(), { env })).response.status, 200);
  assert.equal((await send(labPayload(), { env })).response.status, 200);
  const third = await send(labPayload(), { env });
  assert.equal(third.response.status, 429);
  assert.equal(posted(/\/issues$/).length, 2, 'the refused entry is not filed');
  assert.equal(limiter.seenKeys.length, 3);
  assert.ok(!limiter.seenKeys.some((key) => key.includes('203.0.113.7')), 'the raw address is not handed to the limiter');
});

await test('the KV fallback counts filed entries, reads uncached and then answers 429', async () => {
  const kv = kvStub();
  stubFetch();
  clearTokenCache();
  const env = baseEnv({ RATE_LIMIT: kv.binding });
  for (let i = 0; i < 5; i += 1) {
    const { response } = await send(labPayload(), { env });
    assert.equal(response.status, 200, `entry ${i + 1} should be accepted`);
  }
  const { response, data } = await send(labPayload(), { env });
  assert.equal(response.status, 429);
  assert.ok(data.problems.join(' ').length > 0);
  assert.equal(posted(/\/issues$/).length, 5, 'the sixth entry is not filed');
  assert.equal(kv.store.size, 2, 'one counter per window');
  assert.ok(![...kv.store.keys()].some((key) => key.includes('203.0.113.7')), 'the raw address is not stored');
  assert.ok(kv.reads.length > 0);
  for (const read of kv.reads) assert.equal(read.options?.cacheTtl, 0, 'a stale edge-cached counter must not be reused');
});

await test('the KV slot is reserved before the issue is created, not counted after', async () => {
  const kv = kvStub();
  stubFetch({ issueStatus: 500 });
  clearTokenCache();
  const { response } = await send(labPayload(), { env: baseEnv({ RATE_LIMIT: kv.binding }) });
  assert.equal(response.status, 500, 'GitHub refused this one');
  assert.equal(kv.store.size, 2, 'the slot was already taken when the issue was attempted');
  for (const value of kv.store.values()) assert.equal(value, '1');
});

await test('both limiters apply when both are bound', async () => {
  const kv = kvStub();
  const limiter = limiterStub(50);
  stubFetch();
  clearTokenCache();
  const env = baseEnv({ RATE_LIMITER: limiter.binding, RATE_LIMIT: kv.binding });
  for (let i = 0; i < 5; i += 1) assert.equal((await send(labPayload(), { env })).response.status, 200);
  assert.equal((await send(labPayload(), { env })).response.status, 429, 'the KV windows still apply');
  assert.equal(limiter.seenKeys.length, 6);
});

await test('a client the runtime cannot identify shares one bucket rather than escaping the limit', async () => {
  const kv = kvStub();
  stubFetch();
  clearTokenCache();
  const env = baseEnv({ RATE_LIMIT: kv.binding });
  // No CF-Connecting-IP, and a different forged X-Forwarded-For every time.
  const anonymous = (n) => send(labPayload(), { env, headers: { 'cf-connecting-ip': undefined, 'x-forwarded-for': `198.51.100.${n}` } });
  for (let i = 0; i < 5; i += 1) assert.equal((await anonymous(i)).response.status, 200, `entry ${i + 1}`);
  assert.equal((await anonymous(9)).response.status, 429, 'an unidentified client is throttled, not unlimited');
  assert.equal(kv.store.size, 2, 'every unidentified caller shares the same two counters');
});

await test('X-Forwarded-For is read only when TRUSTED_IP_HEADER names it, and then from the end', async () => {
  const kv = kvStub();
  stubFetch();
  clearTokenCache();
  const env = baseEnv({ RATE_LIMIT: kv.binding, TRUSTED_IP_HEADER: 'X-Forwarded-For' });
  // The first entries are the caller's own; the last is the one the host added.
  await send(labPayload(), { env, headers: { 'cf-connecting-ip': undefined, 'x-forwarded-for': '10.0.0.1, 198.51.100.9' } });
  const first = [...kv.store.keys()];
  await send(labPayload(), { env, headers: { 'cf-connecting-ip': undefined, 'x-forwarded-for': '10.9.9.9, 198.51.100.9' } });
  assert.deepEqual([...kv.store.keys()], first, 'a forged prefix does not mint a new counter');
  assert.equal(kv.store.get(first[0]), '2');
});

await test('RATE_SALT changes the keys the store holds', async () => {
  stubFetch();
  clearTokenCache();
  const plain = kvStub();
  const salted = kvStub();
  await send(labPayload(), { env: baseEnv({ RATE_LIMIT: plain.binding }) });
  await send(labPayload(), { env: baseEnv({ RATE_LIMIT: salted.binding, RATE_SALT: 'a-secret-of-our-own' }) });
  assert.equal(plain.store.size, 2);
  assert.equal(salted.store.size, 2);
  assert.notDeepEqual([...plain.store.keys()], [...salted.store.keys()]);
});

await test('a deployment with no limiter serves, and says so once', async () => {
  stubFetch();
  clearTokenCache();
  const before = logged.length;
  await send(labPayload());
  await send(labPayload());
  const warnings = logged.slice(before).filter((line) => line.includes('E_NO_RATE_LIMIT'));
  assert.equal(warnings.length, 1, 'one warning per instance, not one per request');
  assert.match(warnings[0], /not throttled/);
  assert.equal(posted(/\/issues$/).length, 2, 'it still serves');
});

await test('a failed validation does not spend the rate limit', async () => {
  const kv = kvStub();
  stubFetch();
  clearTokenCache();
  const env = baseEnv({ RATE_LIMIT: kv.binding });
  for (let i = 0; i < 8; i += 1) await send(labPayload({ institution: '' }), { env });
  assert.equal(kv.store.size, 0);
  const { response } = await send(labPayload(), { env });
  assert.equal(response.status, 200);
});

await test('a broken KV binding does not take the endpoint down', async () => {
  stubFetch();
  clearTokenCache();
  const kv = {
    get: async () => {
      throw new Error('kv is down');
    },
    put: async () => {
      throw new Error('kv is down');
    },
  };
  const { response } = await send(labPayload(), { env: baseEnv({ RATE_LIMIT: kv }) });
  assert.equal(response.status, 200, 'the endpoint degrades to no limiting');
});

await test('a GitHub failure is a generic 500 with nothing leaked', async () => {
  stubFetch({ issueStatus: 422 });
  clearTokenCache();
  const { response, data } = await send(labPayload());
  assert.equal(response.status, 500);
  assert.equal(data.ok, false);
  assert.equal(data.problems.length, 1);
  assert.ok(!/422|api\.github|nope/i.test(data.problems[0]), data.problems[0]);
});

await test('missing configuration is a 500, not a crash', async () => {
  stubFetch();
  clearTokenCache();
  const env = baseEnv();
  delete env.GITHUB_APP_PRIVATE_KEY;
  const { response, data } = await send(labPayload(), { env });
  assert.equal(response.status, 500);
  assert.equal(data.ok, false);
  assert.equal(calls.length, 0);
});

await test('responses carry the security headers', async () => {
  stubFetch();
  clearTokenCache();
  const { response } = await send(labPayload());
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
});

await test('no secret and no submitted value appears in any response body', async () => {
  const secrets = [APP_TOKEN, TURNSTILE_SECRET, PKCS8_PEM.replace(/\n/g, ''), 'BEGIN PRIVATE KEY', 'BEGIN RSA PRIVATE KEY'];
  for (const text of seen) {
    for (const secret of secrets) assert.ok(!text.includes(secret), `a response leaked ${secret.slice(0, 24)}`);
    assert.ok(!text.includes('ada@example.org'), 'a response echoed a submitted email address');
  }
  assert.ok(seen.length > 20, `only ${seen.length} responses were checked`);
});

await test('the logs carry counters and codes, never a value', async () => {
  assert.ok(logged.length > 20, `only ${logged.length} log lines were checked`);
  for (const line of logged) {
    for (const text of ['Ada Lovelace', 'ada@example.org', 'University of Hong Kong', APP_TOKEN, TURNSTILE_SECRET, 'PRIVATE KEY', '203.0.113.7']) {
      assert.ok(!line.includes(text), `a log line leaked ${text}`);
    }
    const entry = JSON.parse(line);
    for (const value of Object.values(entry)) assert.ok(typeof value !== 'object', 'a log line carries a structure, not a counter');
  }
});

globalThis.fetch = realFetch;
console.log = realLog;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
