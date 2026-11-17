import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { labApplicationBody, labApplicationMailto, labApplicationErrors } from '../src/lib/lab-application.mjs';

// User-entered punctuation, Unicode and newlines must stay in the body,
// without becoming recipients or additional email headers.
const values = {
  pi: 'Jane 杜 & Doe',
  institution: 'Example University',
  city: 'Hong Kong',
  tier: 'Member lab (Greater Bay Area)',
  keywords: 'memory, learning',
  description: 'Brains & models\nA second line? cc=someone@example.org',
  authority: 'yes',
  consent: 'yes',
  privacy: 'yes',
};
const body = labApplicationBody(values);
const subject = '[Lab] Joining the GBA-CCN Network';
const href = labApplicationMailto('membership@example.org', subject, body);
const parsed = new URL(href);
assert.equal(parsed.protocol, 'mailto:');
assert.equal(parsed.pathname, 'membership@example.org');
assert.deepEqual([...parsed.searchParams.keys()], ['subject', 'body']);
assert.equal(parsed.searchParams.get('subject'), subject);
assert.equal(parsed.searchParams.get('body'), body);
assert.ok(body.includes(values.pi));
assert.ok(body.includes(values.description));
assert.equal(body.match(/\[Confirmed\]/g)?.length, 3);
assert.equal(labApplicationBody().includes('[Confirmed]'), false, 'a blank template must not assert consent');
assert.deepEqual(labApplicationErrors(values), {});
assert.ok(labApplicationErrors({ ...values, pi: '  ' }).pi);
assert.ok(labApplicationErrors({ ...values, keywords: ',,，;\n ' }).keywords);
assert.ok(labApplicationErrors({ ...values, keywords: 'a,b,c,d,e,f,g,h,i' }).keywords);
assert.equal(labApplicationErrors({ ...values, keywords: 'a,b,c,d,e,f,g,h' }).keywords, undefined);
for (const name of ['authority', 'consent', 'privacy']) {
  assert.ok(labApplicationErrors({ ...values, [name]: '' })[name]);
}

// When a build is available, verify the actual page uses the configured
// membership address even though the general contact address is empty.
if (existsSync('dist/join/index.html')) {
  const html = readFileSync('dist/join/index.html', 'utf8');
  const settings = readFileSync('data/network.yml', 'utf8');
  const membership = settings.match(/role: Membership\s[\s\S]*?email:\s*([^\s#]+)/);
  assert.ok(membership, 'membership contact is configured');
  assert.ok(html.includes(`data-recipient="${membership[1]}"`), 'form targets the membership coordinator');
  assert.match(html, /issues\/new\?template=lab\.yml/);
  assert.match(html, /A free GitHub account is required/);
  assert.match(html, /No GitHub account is needed/);
  assert.match(html, /id="copy-lab-email"/);
  assert.doesNotMatch(html, /<input[^>]*type="checkbox"[^>]*\schecked(?:\s|=|>)/);
  console.log('Lab email formatting, consent and built-page routing checks passed.');
} else {
  console.log('Lab email formatting and consent checks passed; built-page checks run after the CI build.');
}
