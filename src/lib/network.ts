import { parse } from 'yaml';
import { z } from 'astro/zod';
// Inlined by Vite at build time, so it works wherever the bundle ends up.
import raw from '../../data/network.yml?raw';

// Network-wide settings live in data/network.yml so that coordinators can
// edit them without touching code. Validated once at build time.

const Person = z.object({
  name: z.string().min(1),
  name_native: z.string().optional(),
  institution: z.string().min(1),
  role: z.string().min(1),
  url: z.string().url().optional(),
});

const Schema = z.object({
  name: z.string().min(1),
  short_name: z.string().min(1),
  acronym: z.string().min(1),
  name_native: z.string().optional(),
  tagline: z.string().min(1),
  mission: z.string().min(1),
  status_banner: z.string().optional(),
  founded: z.number().int(),
  contact_email: z.union([z.string().email(), z.literal('')]).default(''),
  repo_url: z.string().url(),
  seminar: z.object({
    slot: z.string().min(1),
    platform: z.string().min(1),
    fallback_platform: z.string().optional(),
    recording_note: z.string().optional(),
  }),
  coordinators: z.array(Person).default([]),
  host_institutions: z.array(z.string()).default([]),
});

export type Network = z.infer<typeof Schema>;

export const network: Network = Schema.parse(parse(raw));

/** Issue-form links. Template file names must match .github/ISSUE_TEMPLATE/. */
export const forms = {
  lab: `${network.repo_url}/issues/new?template=lab.yml`,
  event: `${network.repo_url}/issues/new?template=event.yml`,
  tutorial: `${network.repo_url}/issues/new?template=tutorial.yml`,
  position: `${network.repo_url}/issues/new?template=position.yml`,
  nomination: `${network.repo_url}/issues/new?template=speaker-nomination.yml`,
  issues: `${network.repo_url}/issues`,
};
