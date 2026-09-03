import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import {
  EVENT_TYPES,
  GBA_CITIES,
  LEVELS,
  MATERIAL_LANGUAGES,
  POSITION_TYPES,
  TIERS,
  TUTORIAL_FORMATS,
} from './lib/taxonomy';

// Every collection reads from the top-level data/ folder (docs/ for documents),
// one file per entry, so that two submissions in the same week never conflict.
// Entries with `draft: true` are validated but never published; the example
// files in each folder rely on this.

const httpUrl = z.string().url();
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM, quoted, e.g. "16:00"');
const slugFile = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:webp|jpg|jpeg|png)$/, 'Photo file name must be lowercase-with-hyphens.webp/jpg/png');

const labs = defineCollection({
  loader: glob({ pattern: '*.yml', base: './data/labs' }),
  schema: z
    .object({
      pi: z.string().min(1),
      pi_native: z.string().optional(),
      lab: z.string().optional(),
      institution: z.string().min(1),
      institution_short: z.string().optional(),
      department: z.string().optional(),
      city: z.string().min(1),
      tier: z.enum(TIERS).default('member'),
      website: httpUrl.optional(),
      email: z.string().email().optional(),
      scholar: httpUrl.optional(),
      github: httpUrl.optional(),
      photo: slugFile.optional(),
      keywords: z.array(z.string().min(1)).min(1).max(8),
      description: z.string().max(700).optional(),
      looking_for: z.string().max(300).optional(),
      joined: z.coerce.date(),
      draft: z.boolean().default(false),
    })
    .superRefine((lab, ctx) => {
      if (lab.tier === 'member' && !(GBA_CITIES as readonly string[]).includes(lab.city)) {
        ctx.addIssue({
          code: 'custom',
          path: ['city'],
          message: `Member labs must be in a Greater Bay Area city (${GBA_CITIES.join(', ')}). Labs elsewhere use "tier: affiliate".`,
        });
      }
    }),
});

const events = defineCollection({
  loader: glob({ pattern: '*.md', base: './data/events' }),
  schema: z
    .object({
      title: z.string().min(1),
      type: z.enum(EVENT_TYPES).default('seminar'),
      date: z.coerce.date(),
      end_date: z.coerce.date().optional(),
      start: hhmm.optional(),
      end: hhmm.optional(),
      speaker: z.string().optional(),
      speaker_native: z.string().optional(),
      speaker_affiliation: z.string().optional(),
      speaker_url: httpUrl.optional(),
      junior_speaker: z
        .object({
          name: z.string().min(1),
          affiliation: z.string().optional(),
          title: z.string().optional(),
        })
        .optional(),
      host_lab: z.string().optional(),
      host_institution: z.string().optional(),
      location: z.string().default('Online'),
      platform: z.string().optional(),
      registration_url: httpUrl.optional(),
      recording: z
        .object({
          bilibili: httpUrl.optional(),
          youtube: httpUrl.optional(),
          other: httpUrl.optional(),
        })
        .optional(),
      slides_url: httpUrl.optional(),
      materials_url: httpUrl.optional(),
      draft: z.boolean().default(false),
    })
    .superRefine((ev, ctx) => {
      if (ev.end_date && ev.end_date.getTime() < ev.date.getTime()) {
        ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'end_date is before date' });
      }
      if (ev.end && !ev.start) {
        ctx.addIssue({ code: 'custom', path: ['end'], message: 'end time given without start time' });
      }
    }),
});

const tutorials = defineCollection({
  loader: glob({ pattern: '*.yml', base: './data/tutorials' }),
  schema: z.object({
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    lab: z.string().optional(),
    format: z.enum(TUTORIAL_FORMATS).default('other'),
    level: z.enum(LEVELS).default('introductory'),
    language: z.enum(MATERIAL_LANGUAGES).default('English'),
    url: httpUrl,
    doi: z.string().optional(),
    topics: z.array(z.string().min(1)).min(1).max(8),
    description: z.string().max(700).optional(),
    added: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const positions = defineCollection({
  loader: glob({ pattern: '*.md', base: './data/positions' }),
  schema: z.object({
    title: z.string().min(1),
    type: z.enum(POSITION_TYPES).default('other'),
    lab: z.string().optional(),
    pi: z.string().optional(),
    institution: z.string().min(1),
    city: z.string().min(1),
    url: httpUrl.optional(),
    contact_email: z.string().email().optional(),
    posted: z.coerce.date(),
    deadline: z.coerce.date().optional(),
    expires: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './data/news' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: '*.md', base: './docs' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().optional(),
    audience: z.enum(['public', 'coordinators']).default('public'),
    order: z.number().int().default(100),
    draft: z.boolean().default(false),
  }),
});

export const collections = { labs, events, tutorials, positions, news, docs };
