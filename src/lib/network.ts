import { parse } from 'yaml';
import { z } from 'astro/zod';
// Inlined by Vite at build time, so it works wherever the bundle ends up.
import raw from '../../data/network.yml?raw';
import { url } from './url';

// Network-wide settings live in data/network.yml so that coordinators can
// edit them without touching code. Validated once at build time.

const Person = z.object({
  name: z.string().min(1),
  name_native: z.string().optional(),
  institution: z.string().min(1),
  role: z.string().min(1),
  url: z.string().url().optional(),
});

const optionalUrl = z.union([z.string().url(), z.literal('')]).default('');

// The web-form endpoint. Empty until one is deployed, and https only, because
// the browser posts personal data to it. See docs/web-forms.md.
const optionalHttpsUrl = z
  .union([z.string().url().startsWith('https://', 'submit_url must start with https://'), z.literal('')])
  .default('');

const Schema = z.object({
  name: z.string().min(1),
  short_name: z.string().min(1),
  acronym: z.string().min(1),
  name_native: z.string().optional(),
  stage: z.enum(['founding', 'active']).default('founding'),
  tagline: z.string().min(1),
  tagline_native: z.string().optional(),
  pitch: z.string().optional(),
  mission: z.string().min(1),
  status_banner: z.string().optional(),
  founded: z.number().int(),
  contact_email: z.union([z.string().email(), z.literal('')]).default(''),
  mailing_list_url: optionalUrl,
  submit_url: optionalHttpsUrl,
  repo_url: z.string().url(),
  seminar: z.object({
    slot: z.string().min(1),
    proposed: z.boolean().default(false),
    platform: z.string().min(1),
    fallback_platform: z.string().optional(),
    recording_note: z.string().optional(),
  }),
  coordinators: z.array(Person).default([]),
  host_institutions: z.array(z.string()).default([]),
});

export type Network = z.infer<typeof Schema>;

export const network: Network = Schema.parse(parse(raw));

/** True while the network recruits its founding cohort. */
export const founding = network.stage === 'founding';

/** The seminar slot, with the caveat while it awaits confirmation. */
export const slotLine = network.seminar.proposed
  ? `Proposed: ${network.seminar.slot}, subject to confirmation by the founding labs`
  : network.seminar.slot;

/** Issue-form links. Template file names must match .github/ISSUE_TEMPLATE/. */
export const forms = {
  lab: `${network.repo_url}/issues/new?template=lab.yml`,
  event: `${network.repo_url}/issues/new?template=event.yml`,
  tutorial: `${network.repo_url}/issues/new?template=tutorial.yml`,
  position: `${network.repo_url}/issues/new?template=position.yml`,
  nomination: `${network.repo_url}/issues/new?template=speaker-nomination.yml`,
  issues: `${network.repo_url}/issues`,
};

const enc = encodeURIComponent;
const mailto = (subject: string, body: string) =>
  network.contact_email ? `mailto:${network.contact_email}?subject=${enc(subject)}&body=${enc(body)}` : '';

const JOIN_TEMPLATE = `PI name (Latin script):
Name in native script (optional):
Lab name (optional):
Institution and department:
City:
Member lab (in the Greater Bay Area) or affiliate lab (elsewhere):
Lab website:
ORCID or other research profile:
Up to eight research keywords:
Two sentences on what the lab does:
Looking for (students, collaborators, data, equipment; optional):

Photo: attach a square head-and-shoulders photo, or leave it out.

I consent to the publication of this lab entry under CC BY 4.0 and to the display of the photo, if provided, on the network's website and channels. I have read the privacy statement.`;

const NOMINATE_TEMPLATE = `Nominee:
Affiliation:
Web page:
Why this speaker, in one line:
Suggested host lab (optional):
Would you host the talk yourself? (yes/no)`;

const FOLLOW_TEMPLATE = `Please add me to the announcement list.
Name:
Institution:
Role (faculty, postdoc, student, other):`;

/**
 * Ordinary routes that need no GitHub account. Empty strings until the role
 * address (contact_email) or a subscription page (mailing_list_url) exists;
 * pages fall back to the GitHub forms and the calendar feed.
 */
export const routes = {
  joinEmail: mailto(`[Lab] Joining the ${network.short_name}`, JOIN_TEMPLATE),
  nominateEmail: mailto(`[Speaker] Nomination for the ${network.short_name}`, NOMINATE_TEMPLATE),
  followEmail: mailto('Announcement list', FOLLOW_TEMPLATE),
  /** Where "Follow the seminars" goes: a subscription page if there is one, else the calendar feed. */
  follow: network.mailing_list_url || url('calendar.ics'),
};
