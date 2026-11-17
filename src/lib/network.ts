import { parse } from 'yaml';
import { z } from 'astro/zod';
// Inlined by Vite at build time, so it works wherever the bundle ends up.
import raw from '../../data/network.yml?raw';
import { url } from './url';
import { labApplicationBody, labApplicationMailto } from './lab-application.mjs';

// Network-wide settings live in data/network.yml so that coordinators can
// edit them without touching code. Validated once at build time.

const Person = z.object({
  name: z.string().min(1),
  name_native: z.string().optional(),
  institution: z.string().min(1),
  // Two or three words: it is rendered as a chip on the About page, and a
  // sentence there would wrap badly and lose the point of a chip.
  role: z.string().min(1).max(30),
  role_detail: z.string().optional(),
  url: z.string().url().optional(),
  // Optional: a convener may prefer to be reached through the network address
  // rather than personally. Validated here so a typo stops the build instead of
  // printing a dead mailto on the one page that says who to write to.
  email: z.string().email().optional(),
});

const optionalUrl = z.union([z.string().url(), z.literal('')]).default('');


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

/** The seminar slot, with the proposed caveat only while seminar.proposed is true. */
export const slotLine = network.seminar.proposed
  ? `Proposed: ${network.seminar.slot}, subject to confirmation by the member labs`
  : `Usual seminar time: ${network.seminar.slot}`;

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

const membershipCoordinator = network.coordinators.find((person) => person.role.toLowerCase() === 'membership');
export const membershipContact = {
  name: membershipCoordinator?.name || 'the coordinators',
  email: membershipCoordinator?.email || network.contact_email,
};
export const labApplicationSubject = `[Lab] Joining the ${network.short_name}`;

const NOMINATE_TEMPLATE = `Nominee:
Affiliation:
Web page:
Why this speaker, in one line:
Suggested host lab (optional):
Would you host the talk yourself? (yes/no)
If yes, the earliest month you could host (there are twelve slots a year, one a month):`;

const FOLLOW_TEMPLATE = `Please add me to the announcement list.
Name:
Institution:
Role (faculty, postdoc, student, other):`;

/**
 * Lab applications go to the membership coordinator. Other email routes use
 * contact_email; newsletter links prefer the configured subscription page.
 */
export const routes = {
  joinEmail: membershipContact.email
    ? labApplicationMailto(membershipContact.email, labApplicationSubject, labApplicationBody())
    : '',
  nominateEmail: mailto(`[Speaker] Nomination for the ${network.short_name}`, NOMINATE_TEMPLATE),
  followEmail: mailto('Announcement list', FOLLOW_TEMPLATE),
  /** Subscribe to the newsletter, contact the organisers, or browse events. */
  follow: network.mailing_list_url || mailto('Announcement list', FOLLOW_TEMPLATE) || url('events/'),
};
