// The endpoint behind the web forms under /forms/ on the site. It takes the
// JSON a form posts, checks it with the same rules the intake workflow uses,
// and opens the GitHub issue the matching issue template would have produced.
// Everything after that is unchanged: the "Intake submissions" workflow parses
// the issue, writes the data file and opens a pull request for a coordinator.
//
// The worker adds nothing to a submission and decides nothing. It is a doorway
// that turns a form post into an issue, so that people without a GitHub
// account travel the same reviewed path as everybody else.
//
// Only Web platform APIs are used: fetch, crypto.subtle, TextEncoder, URL,
// Request and Response. No node: imports and no dependencies, so the same file
// runs on Cloudflare Workers, Deno Deploy, Netlify Edge and Vercel Edge.
//
// The validation is not repeated here. scripts/lib/validate.mjs holds the one
// ladder, shared with scripts/intake.mjs, and scripts/lib/forms.mjs holds the
// field descriptors. A submission is therefore judged by the same rules and
// answered with the same words wherever it arrives from, per-field rules and
// the rules that compare two fields alike.
//
// What this file adds is the guarantee that the issue it writes says what was
// validated: the body carries the normalised values, a value that repeats one
// of the form's own questions as a heading is refused with a message, and the
// finished body is parsed back with the intake's own parser and compared
// before anything is sent. An issue that would be read differently is never
// filed. One thing is deliberately not neutralised: an @name in a field still
// reads as a mention on GitHub. Escaping it would put a backslash into the
// published data file and break that comparison, so the answer to abuse there
// is the rate limit below and the coordinator who merges the pull request.
//
// Operator guide: docs/web-forms.md. Short version: the README next to this
// file. Privacy rule for anyone editing this: never log a field value, a token
// or the private key.

import { FORMS } from '../../scripts/lib/forms.mjs';
import { NO_RESPONSE } from '../../scripts/lib/issue-form.mjs';
import { collapse, crossChecks, dateInHongKong, plainLabel, readFields, readValues } from '../../scripts/lib/validate.mjs';

// ------------------------------------------------------------- constants

const MAX_BODY_BYTES = 64 * 1024;
/** A person reading the questions takes far longer than this. */
const MIN_ELAPSED_MS = 3000;
const RATE_PER_HOUR = 5;
const RATE_PER_DAY = 20;
/** The salt for the rate-limit keys when RATE_SALT is not set. It is public. */
const RATE_SALT_DEFAULT = 'gba-ccn';
const TITLE_MAX = 120;

/** A Markdown heading line, in the loose shape a renderer would still accept. */
const HEADING_LINE_RE = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;

const API = 'https://api.github.com';
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const USER_AGENT = 'gba-ccn-intake-worker';

/** The field whose value becomes the short name in the issue title. */
const TITLE_FIELD = Object.freeze({ lab: 'pi', event: 'title', tutorial: 'title', position: 'title', nomination: 'name' });

/** Settings without which nothing can be filed. */
const REQUIRED_ENV = Object.freeze(['GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_INSTALLATION_ID', 'GITHUB_OWNER', 'GITHUB_REPO']);

const GENERIC_PROBLEM = 'The entry could not be filed just now. Try again in a few minutes, or use the GitHub issue form.';
const FORBIDDEN_PROBLEM = 'This form can only be sent from the network site.';
const RATE_PROBLEM = 'That is a lot of entries from one connection in a short time. Wait an hour and try again, or use the GitHub issue form.';
// The backstop message. The named causes are the two that reach it in practice;
// anything else that would be read back differently lands here as well.
const ROUND_TRIP_PROBLEM =
  'One of the longer answers would be read differently once the entry is filed, so nothing was sent. A line beginning "###" that repeats a question on this form is the usual cause. Remove it and send the entry again.';

const SECURITY_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'",
  'x-frame-options': 'DENY',
});

// --------------------------------------------------------------- logging

/**
 * One line of JSON per request. Counters and codes only: never a field value,
 * never a token, never anything a submitter typed.
 */
function log(entry) {
  try {
    console.log(JSON.stringify(entry));
  } catch {
    // A logger that throws must not take the request down with it.
  }
}

// --------------------------------------------------------------- replies

function json(status, payload, origin) {
  const headers = { ...SECURITY_HEADERS, vary: 'Origin' };
  if (origin) headers['access-control-allow-origin'] = origin;
  return new Response(JSON.stringify(payload), { status, headers });
}

const fail = (status, problems, origin) => json(status, { ok: false, problems }, origin);

// ------------------------------------------------------- the origin allowlist

/** An origin reduced to scheme and host, so that a trailing slash or a capital letter still matches. */
function normaliseOrigin(value) {
  const text = String(value ?? '').trim().replace(/\/+$/, '');
  if (!text) return '';
  try {
    const url = new URL(text);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * The canonical form of the request's Origin when ALLOWED_ORIGIN lists it, and
 * '' otherwise. ALLOWED_ORIGIN is a comma-separated list; a literal "*" in it
 * is ignored, because this endpoint opens issues under the network's own
 * credential and must never accept posts from anywhere.
 */
function allowedOrigin(env, header) {
  const asked = normaliseOrigin(header);
  if (!asked) return '';
  for (const entry of String(env?.ALLOWED_ORIGIN ?? '').split(',')) {
    if (entry.trim() === '*') continue;
    if (normaliseOrigin(entry) === asked) return asked;
  }
  return '';
}

// ----------------------------------------------------------- reading the post

/** The request body as text, or null when it is larger than the cap. */
async function readBody(request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const stream = request.body;
  if (!stream || typeof stream.getReader !== 'function') {
    const text = await request.text();
    return text.length > MAX_BODY_BYTES ? null : text;
  }
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    joined.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

/**
 * Control characters and stray carriage returns are removed before anything
 * else looks at a value, so that validation and the issue body see exactly the
 * same text. That is what makes the round trip exact: whatever the intake
 * script reads back out of the issue is what was checked here.
 */
function clean(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

/**
 * The submitted fields with every string cleaned. Anything else is left alone
 * for the validator to complain about.
 *
 * Only the ids this form declares are copied, and the result has no prototype,
 * so a payload carrying "__proto__" or "constructor" cannot reach a setter or
 * plant a value that later reads back through the prototype chain without ever
 * having passed through clean().
 */
function cleanFields(form, fields) {
  const input = fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {};
  const out = Object.create(null);
  for (const field of form.fields) {
    if (!Object.prototype.hasOwnProperty.call(input, field.id)) continue;
    const value = input[field.id];
    if (typeof value === 'string') out[field.id] = clean(value);
    else if (Array.isArray(value)) out[field.id] = value.map((item) => (typeof item === 'string' ? clean(item) : item));
    else out[field.id] = value;
  }
  return out;
}

// ------------------------------------------------------------- the issue

/**
 * The text of one field in the issue body. The argument is the value the
 * validator returned, never the raw string the submitter sent: a text or
 * sentence field is already collapsed to one line, a list is the parsed items,
 * a date, time, email, lab id or DOI is already normalised. Only markdown and
 * image kinds can therefore carry a newline at all, which is most of what
 * stops a value from impersonating the next field's heading.
 */
function fieldText(field, value) {
  if (field.kind === 'checkboxes') {
    const flags = Array.isArray(value) ? value : [];
    return (field.options ?? []).map((option, i) => `- [${flags[i] ? 'X' : ' '}] ${option.label}`).join('\n');
  }
  if (value === undefined || value === null) return NO_RESPONSE;
  const text = Array.isArray(value) ? value.join(', ') : String(value).trim();
  return text || NO_RESPONSE;
}

/**
 * The Markdown body GitHub would have written for this submission: one
 * "### Label" block per field, in the order the form declares them, with
 * "_No response_" for an empty one. Nothing is appended after the last field,
 * because a trailer there would become part of that field's value; the note
 * about where the submission came from goes in a separate comment.
 *
 * `values` is the readValues result, not the posted fields.
 */
export function renderIssueBody(form, values) {
  let body = '';
  for (const field of form.fields) body += `### ${field.label}\n\n${fieldText(field, values?.[field.id])}\n\n`;
  return body;
}

/**
 * Two values read out of a form are the same value. Everything a form holds is
 * a string, an array of strings, an array of booleans or undefined.
 */
function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => item === b[i]);
  }
  return a === b;
}

/**
 * The two shapes a value must not have, refused by name before the issue
 * exists so that the submitter is told what to change.
 *
 * A line that repeats one of this form's own labels as a heading would be read
 * by the intake parser as the start of another field, which moves text from
 * one field into another. That is checked on the text as it was typed, not
 * only on what would be written: in a one-line field the collapse defuses it
 * anyway, but somebody who typed a heading should hear about it rather than
 * find it welded into the middle of a sentence.
 *
 * The words "_No response_" alone are how an empty field is written, so a
 * value that is exactly that would come back blank.
 *
 * The round-trip check below catches both as well. This exists for the
 * message: "remove this line" is something a submitter can act on.
 */
function checkRenderable(form, fields, values, problems) {
  const labels = new Set(form.fields.map((f) => String(f.label).trim()));
  for (const field of form.fields) {
    if (field.kind === 'checkboxes') continue;
    const label = plainLabel(field.label);
    const raw = fields?.[field.id];
    if (typeof raw === 'string') {
      for (const line of raw.split('\n')) {
        const heading = HEADING_LINE_RE.exec(line);
        if (heading && labels.has(heading[1].trim())) {
          problems.push(`"${label}" contains the line "${line.trim()}", which repeats a question on this form and would be read as the start of another field. Remove that line and send the entry again.`);
        }
      }
    }
    const value = values?.[field.id];
    if (value === undefined || value === null) continue;
    if (fieldText(field, value).trim() === NO_RESPONSE) {
      problems.push(`"${label}" cannot be the words "${NO_RESPONSE}" on their own: that is how an empty field is written, so the entry would arrive blank. Write something else.`);
    }
  }
}

/** "[Lab] Ada Lovelace": the prefix, one short name, at most 120 characters. */
export function issueTitle(form, values) {
  const raw = values?.[TITLE_FIELD[form.type]];
  const name = collapse(typeof raw === 'string' ? raw : '');
  const title = `${form.prefix} ${name}`.trim();
  // Array.from walks code points, so the cut cannot land inside a surrogate
  // pair and leave half an emoji or half an astral ideograph in the JSON.
  const points = Array.from(title);
  return points.length > TITLE_MAX ? points.slice(0, TITLE_MAX).join('').trim() : title;
}

/** The labels the intake workflow looks for. A nomination is not intake; it is read by coordinators only. */
export function issueLabels(form) {
  return form.type === 'nomination' ? [form.label] : ['intake', form.label];
}

/** The note that says where this came from. A separate comment, never part of the body. */
function trailer(form) {
  const lines = ['Filed through the web form on the site, for a contributor without a GitHub account. The fields above are exactly what the form collected.'];
  if (form.type === 'lab') {
    lines.push('The web form takes no photo upload. A photo can be added later by replying here with the file attached; the roster shows initials until then.');
  }
  return lines.join('\n\n');
}

// ------------------------------------------------------ the GitHub credential

// One installation token per worker instance, reused until shortly before it
// expires. Instances are short-lived and this is memory only: nothing is
// written anywhere.
let cachedToken = null;

/** Exported for the tests, which need each case to start from a cold instance. */
export function clearTokenCache() {
  cachedToken = null;
  limiterWarned = false;
}

/**
 * The DER bytes of a PEM block. Secret stores mangle newlines differently, so
 * a key pasted with literal \n escapes is accepted as well as a real
 * multi-line one.
 */
function pemToDer(pem) {
  const text = String(pem ?? '').replace(/\\r/g, '').replace(/\\n/g, '\n').trim();
  const match = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/.exec(text);
  if (!match) throw new Error('E_KEY_FORMAT');
  const base64 = match[2].replace(/\s+/g, '');
  let binary;
  try {
    binary = atob(base64);
  } catch {
    throw new Error('E_KEY_BASE64');
  }
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) der[i] = binary.charCodeAt(i);
  return { label: match[1].trim(), der };
}

/** A DER length, short form under 128 and long form above it. */
function derLength(size) {
  if (size < 0x80) return [size];
  const bytes = [];
  for (let rest = size; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest % 256);
  return [0x80 | bytes.length, ...bytes];
}

/**
 * GitHub hands out App private keys in PKCS#1 ("BEGIN RSA PRIVATE KEY"), and
 * WebCrypto imports only PKCS#8. Wrapping the PKCS#1 key in the PKCS#8
 * envelope, which is a fixed rsaEncryption header around the same bytes, saves
 * every operator an openssl step and cannot change the key.
 */
function wrapPkcs1(pkcs1) {
  const header = [0x02, 0x01, 0x00, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...derLength(pkcs1.length)];
  const inner = header.length + octet.length + pkcs1.length;
  const out = new Uint8Array(1 + derLength(inner).length + inner);
  let at = 0;
  out[at++] = 0x30;
  for (const byte of derLength(inner)) out[at++] = byte;
  for (const byte of header) out[at++] = byte;
  for (const byte of octet) out[at++] = byte;
  out.set(pkcs1, at);
  return out;
}

async function importPrivateKey(pem) {
  const { label, der } = pemToDer(pem);
  const pkcs8 = label === 'RSA PRIVATE KEY' ? wrapPkcs1(der) : der;
  try {
    return await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  } catch {
    throw new Error('E_KEY_IMPORT');
  }
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const encodeSegment = (value) => base64url(new TextEncoder().encode(JSON.stringify(value)));

/** The App's own JWT: valid for nine minutes, backdated a minute against clock skew. */
async function appJwt(env) {
  const now = Math.floor(Date.now() / 1000);
  const signed = `${encodeSegment({ alg: 'RS256', typ: 'JWT' })}.${encodeSegment({ iat: now - 60, exp: now + 540, iss: String(env.GITHUB_APP_ID) })}`;
  const key = await importPrivateKey(env.GITHUB_APP_PRIVATE_KEY);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signed));
  return `${signed}.${base64url(new Uint8Array(signature))}`;
}

function githubFetch(url, token, init = {}) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': USER_AGENT,
    authorization: `Bearer ${token}`,
  };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  return fetch(url, { ...init, headers });
}

/**
 * An installation token for the App. This is the credential that matters:
 * GitHub does not start new workflow runs from events created with a
 * workflow's own GITHUB_TOKEN, but an App installation token is not that
 * token, so the issue it opens does start the intake run.
 */
async function installationToken(env) {
  const installation = String(env.GITHUB_INSTALLATION_ID);
  const key = `${env.GITHUB_APP_ID}/${installation}`;
  const now = Date.now();
  if (cachedToken && cachedToken.key === key && cachedToken.expires - 60_000 > now) return cachedToken.token;

  const jwt = await appJwt(env);
  const response = await githubFetch(`${API}/app/installations/${encodeURIComponent(installation)}/access_tokens`, jwt, { method: 'POST' });
  if (!response.ok) throw new Error(`E_APP_TOKEN_${response.status}`);
  const data = await response.json().catch(() => null);
  if (!data || typeof data.token !== 'string') throw new Error('E_APP_TOKEN_BODY');
  cachedToken = { key, token: data.token, expires: Date.parse(data.expires_at) || now + 3_540_000 };
  return cachedToken.token;
}

async function createIssue(env, token, issue) {
  const url = `${API}/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/issues`;
  const response = await githubFetch(url, token, { method: 'POST', body: JSON.stringify(issue) });
  if (!response.ok) throw new Error(`E_ISSUE_${response.status}`);
  const data = await response.json().catch(() => null);
  if (!data || typeof data.number !== 'number') throw new Error('E_ISSUE_BODY');
  return { number: data.number, url: String(data.html_url ?? '') };
}

async function commentOnIssue(env, token, number, text) {
  const url = `${API}/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/issues/${number}/comments`;
  const response = await githubFetch(url, token, { method: 'POST', body: JSON.stringify({ body: text }) });
  if (!response.ok) throw new Error(`E_COMMENT_${response.status}`);
}

// ------------------------------------------------------------- Turnstile

/** True when the token passes, or when the check is not configured at all. */
async function turnstilePasses(env, token, ip) {
  const form = new URLSearchParams({ secret: String(env.TURNSTILE_SECRET), response: String(token ?? '') });
  if (ip) form.set('remoteip', ip);
  const response = await fetch(TURNSTILE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!response.ok) return false;
  const data = await response.json().catch(() => null);
  return Boolean(data && data.success === true);
}

// ------------------------------------------------------------ rate limiting

/**
 * The client's address, or '' when this runtime does not tell us.
 *
 * Only a header the platform itself sets is read. On Cloudflare that is
 * CF-Connecting-IP, which the edge overwrites on every request. Anywhere else,
 * name the header the host appends in TRUSTED_IP_HEADER; for X-Forwarded-For
 * the LAST entry is the one the platform added, and the entries before it are
 * whatever the caller sent. Guessing here would be worse than not knowing: a
 * caller who can choose the address gets a fresh counter per request.
 */
function clientIp(request, env) {
  const direct = request.headers.get('cf-connecting-ip');
  if (direct) return direct.trim();
  const name = String(env?.TRUSTED_IP_HEADER ?? '').trim().toLowerCase();
  if (!name) return '';
  const value = request.headers.get(name);
  if (!value) return '';
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/**
 * A short keyed digest of the address. The store holds this rather than the
 * address itself, for at most a day. The default salt is in this file and
 * therefore public, so the digests are guessable unless an operator sets
 * RATE_SALT; that is what that variable is for.
 *
 * A client we cannot identify shares one bucket instead of escaping the limit,
 * so an unknown address is throttled rather than unlimited.
 */
async function clientKey(env, ip) {
  const salt = String(env?.RATE_SALT ?? '').trim() || RATE_SALT_DEFAULT;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip || 'unidentified'}`));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The atomic edge limiter, when one is bound. */
const nativeLimiter = (env) => (env?.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function' ? env.RATE_LIMITER : null);

/** The KV store behind the longer windows, when one is bound. */
const kvLimiter = (env) => (env?.RATE_LIMIT && typeof env.RATE_LIMIT.get === 'function' && typeof env.RATE_LIMIT.put === 'function' ? env.RATE_LIMIT : null);

let limiterWarned = false;

/**
 * Said once per instance, on its first request, so that a deployment with
 * nothing throttling it is visible in `wrangler tail` rather than silent.
 */
function warnIfNoLimiter(env) {
  if (limiterWarned) return;
  limiterWarned = true;
  if (nativeLimiter(env) || kvLimiter(env)) return;
  log({
    event: 'warning',
    code: 'E_NO_RATE_LIMIT',
    message: 'No RATE_LIMITER or RATE_LIMIT binding is configured, so this endpoint is not throttled. See wrangler.toml.',
  });
}

/**
 * The KV fallback, for a host with no rate-limiting binding of its own: two
 * fixed windows, read and immediately written back one higher, before the
 * issue is created. Reserving the slot first is what stops a burst from all
 * reading the same count and all passing; cacheTtl 0 stops a counter cached at
 * this edge being reused for a minute after it changed.
 *
 * KV is eventually consistent, so this is a brake and not a hard limit: a
 * write takes a moment to reach every colo, and requests landing in two of
 * them meanwhile can both pass. A submission that then fails to file still
 * costs its slot. The hard gate is a coordinator merging the pull request.
 */
async function reserveKvSlot(kv, id) {
  const now = Date.now();
  const windows = [
    { key: `rl:h:${id}:${Math.floor(now / 3_600_000)}`, limit: RATE_PER_HOUR, ttl: 3600 },
    { key: `rl:d:${id}:${Math.floor(now / 86_400_000)}`, limit: RATE_PER_DAY, ttl: 86_400 },
  ];
  const counts = await Promise.all(windows.map((w) => kv.get(w.key, { cacheTtl: 0 })));
  const used = windows.map((w, i) => ({ ...w, used: Number(counts[i]) || 0 }));
  if (used.some((w) => w.used >= w.limit)) return false;
  await Promise.all(used.map((w) => kv.put(w.key, String(w.used + 1), { expirationTtl: w.ttl })));
  return true;
}

/**
 * Take one slot for this client. True means carry on.
 *
 * The native binding is preferred: its counter lives in the edge itself and is
 * atomic, so two requests arriving together cannot both pass. KV is the
 * fallback where no such binding exists, and adds the longer hour and day
 * windows. With both bound a submission has to pass both.
 *
 * This is called after validation and immediately before the issue is created,
 * so a submitter correcting a typo is never locked out, and a limiter that is
 * itself broken does not close the door.
 */
async function takeSlot(env, ip) {
  const limiter = nativeLimiter(env);
  const kv = kvLimiter(env);
  if (!limiter && !kv) return true;
  try {
    const id = await clientKey(env, ip);
    if (limiter) {
      const outcome = await limiter.limit({ key: id });
      if (!(outcome && outcome.success)) return false;
    }
    if (kv) return await reserveKvSlot(kv, id);
    return true;
  } catch {
    log({ event: 'error', code: 'E_RATE' });
    return true;
  }
}

// ------------------------------------------------------------- the handler

export default {
  async fetch(request, env, ctx) {
    warnIfNoLimiter(env);
    const origin = allowedOrigin(env, request.headers.get('origin'));

    if (request.method === 'OPTIONS') {
      if (!origin) return fail(403, [FORBIDDEN_PROBLEM], '');
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'Content-Type',
          'access-control-max-age': '86400',
          'cache-control': 'no-store',
          vary: 'Origin',
        },
      });
    }
    if (request.method !== 'POST') return fail(405, ['Send the entry with POST.'], origin);
    if (!origin) {
      log({ event: 'rejected', reason: 'origin' });
      return fail(403, [FORBIDDEN_PROBLEM], '');
    }

    try {
      return await handlePost(request, env, ctx, origin);
    } catch (err) {
      // Codes only. A message from a library or from GitHub could carry
      // something a submitter typed, and a stack trace helps only an attacker.
      log({ event: 'error', code: shortCode(err) });
      return fail(500, [GENERIC_PROBLEM], origin);
    }
  },
};

function shortCode(err) {
  const text = String(err?.message ?? 'E_UNKNOWN');
  return /^E_[A-Z0-9_]{1,40}$/.test(text) ? text : 'E_UNEXPECTED';
}

async function handlePost(request, env, ctx, origin) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(contentType.trim())) return fail(400, ['Send the entry as JSON.'], origin);

  const text = await readBody(request);
  if (text === null) return fail(400, ['That entry is larger than this form accepts. Shorten the longest text and send it again.'], origin);

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return fail(400, ['The entry did not arrive as valid JSON. Reload the page and try again.'], origin);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return fail(400, ['The entry did not arrive in the expected shape. Reload the page and try again.'], origin);
  }

  // The two cheap traps. Both answer like an ordinary success: telling a bot
  // that it failed only teaches it what to change. Nothing is created and
  // nothing but a counter is logged.
  const elapsed = Number(payload.elapsed);
  const trapped = String(payload.trap ?? '') !== '';
  if (trapped || !Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) {
    log({ event: 'discarded', reason: trapped ? 'trap' : 'fast' });
    return json(200, { ok: true, issue: '', number: 0 }, origin);
  }

  const ip = clientIp(request, env);

  // The page loads no third-party script, so it sends no Turnstile token and
  // this stays inert unless an operator sets the secret. Switching it on means
  // adding the widget to the form page as well; see the README next to this
  // file before doing either.
  if (env?.TURNSTILE_SECRET) {
    let passed = false;
    try {
      passed = await turnstilePasses(env, payload.turnstile, ip);
    } catch {
      log({ event: 'error', code: 'E_TURNSTILE' });
    }
    if (!passed) {
      log({ event: 'rejected', reason: 'turnstile' });
      return fail(400, ['The anti-spam check did not pass. Reload the page and send the entry again.'], origin);
    }
  }

  const type = typeof payload.type === 'string' ? payload.type : '';
  const form = Object.prototype.hasOwnProperty.call(FORMS, type) ? FORMS[type] : null;
  if (!form) return fail(400, ['That is not a form this endpoint knows.'], origin);

  const fields = cleanFields(form, payload.fields);
  const problems = [];

  // There is no photo route in this version, and saying so only in the page
  // markup would leave the field open to a direct post: an image value drives
  // the intake workflow's downloader. Refuse it here, where the claim is made.
  for (const field of form.fields) {
    if (field.kind !== 'image') continue;
    const value = fields[field.id];
    if (typeof value === 'string' && value.trim()) {
      problems.push(`"${plainLabel(field.label)}" cannot be sent through the web form. Leave it out; a photo can be added later by replying to the issue with the file attached.`);
    }
    delete fields[field.id];
  }

  const values = readValues(form, fields, problems);
  // The rules that compare two fields, the same call the intake builders make.
  // The intake would refuse these too, but by then the issue exists and a
  // submitter with no account cannot edit it, so they have to be caught here.
  // checkNoMeetingLinks is among them: a Zoom or Tencent link must never reach
  // a public issue.
  crossChecks(type, values, problems, dateInHongKong(new Date().toISOString()));
  checkRenderable(form, fields, values, problems);
  if (problems.length) {
    log({ event: 'rejected', reason: 'invalid', type, problems: problems.length });
    return fail(400, problems, origin);
  }

  const missing = REQUIRED_ENV.filter((name) => !String(env?.[name] ?? '').trim());
  if (missing.length) {
    log({ event: 'error', code: 'E_CONFIG', missing: missing.length });
    return fail(500, [GENERIC_PROBLEM], origin);
  }

  // The last word on the round trip, and a general one: read the body back
  // with the same parser the intake workflow uses and refuse unless it yields
  // exactly the values validated above. Whatever the trick, a body that would
  // be read as something else is never filed.
  const body = renderIssueBody(form, values);
  const echo = [];
  const readBack = readFields(form, body, echo);
  if (echo.length || form.fields.some((field) => !sameValue(readBack[field.id], values[field.id]))) {
    log({ event: 'rejected', reason: 'roundtrip', type });
    return fail(400, [ROUND_TRIP_PROBLEM], origin);
  }

  if (!(await takeSlot(env, ip))) {
    log({ event: 'rejected', reason: 'rate' });
    return fail(429, [RATE_PROBLEM], origin);
  }

  const issue = { title: issueTitle(form, values), body, labels: issueLabels(form) };

  const token = await installationToken(env);
  const created = await createIssue(env, token, issue);

  // The note about where this came from, as a comment. A comment does not
  // re-trigger the intake workflow and cannot corrupt the last field of the
  // body. If it fails the issue still stands, so it is not fatal.
  const note = commentOnIssue(env, token, created.number, trailer(form)).catch(() => log({ event: 'error', code: 'E_COMMENT' }));
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(note);
  else await note;

  log({ event: 'filed', type, issue: created.number });
  return json(200, { ok: true, issue: created.url, number: created.number }, origin);
}
