---
title: Data model
summary: Fields accepted by the website, validation rules and references between data files.
audience: public
order: 70
---

Website content is stored as files in the public repository: labs, events, tutorials, positions and news in `data/`; documents in `docs/`; and network settings in `data/network.yml`. Each entry has its own file. The build validates entries against `src/content.config.ts` and settings against `src/lib/network.ts`, using the vocabularies in `src/lib/taxonomy.ts`.

This reference is for contributors editing files directly. The [Join page](../../join/) links to submission forms, and the [operations handbook](../operations/) explains review and publication. Forms may apply additional checks, including restrictions on direct meeting URLs and passcodes.

## Conventions used below

- The id of an entry is its file name without the extension: `data/labs/jane-doe.yml` has the id `jane-doe`. Names are lowercase with hyphens.
- URL means a full address with its scheme, such as `https://example.org/lab`.
- Date means YYYY-MM-DD, unquoted.
- Time means 24-hour HH:MM in Hong Kong Time, quoted ("16:00"), because unquoted YAML may read it as a number.
- Quote titles that contain a colon.
- Every collection has `draft` (boolean: `true` or `false`, default `false`). See Drafts and examples.
- `.md` files carry YAML frontmatter between two `---` lines, then a Markdown body.

## Labs

Location: `data/labs/<pi-name>.yml`. Member labs must be in a Greater Bay Area city (Hong Kong, Shenzhen, Guangzhou, Macau, Zhuhai, Foshan, Dongguan, Huizhou, Zhongshan, Jiangmen, Zhaoqing); affiliate labs may be anywhere.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| pi | text | Yes | Latin script |
| pi_native | text | No | Any script |
| lab | text | No | Site shows "PI Lab" if absent |
| institution | text | Yes | |
| institution_short | text | No | For chips and filters |
| department | text | No | |
| city | text | Yes | Must be a listed GBA city when tier is member |
| tier | member or affiliate | No, default member | |
| website | URL | No | |
| email | email | No | Published if given |
| scholar | URL | No | |
| github | URL | No | |
| orcid | URL | No | The full address, https://orcid.org/0000-0000-0000-0000; the form accepts the bare iD |
| profile | URL | No | Any other research profile page |
| photo | file name | No | Lowercase-with-hyphens plus .webp, .jpg, .jpeg or .png |
| keywords | list of text | Yes | 1 to 8 items, none empty |
| description | text | No | At most 700 characters |
| looking_for | text | No | At most 300 characters |
| joined | date | Yes | Entry date; form submissions use the issue creation date |

Minimal complete example:

```yaml
pi: Jane Doe
institution: Southern University of Science and Technology
city: Shenzhen
keywords:
  - working memory
joined: 2026-09-03
```

## Events

Location: `data/events/YYYY-MM-DD-slug.md`; the id is the whole name without `.md`. The body is the abstract, optionally followed by a short biography. Use the confirmed date and time for the event, even when it differs from the usual monthly slot. Use `location_url` for a venue link intended for public use. Keep private access details out of these public files; forms reject direct meeting URLs and passcodes.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | text | Yes | Quote it if it contains a colon |
| type | seminar, workshop, summer-school, hackathon, journal-club or other | No, default seminar | |
| date | date | Yes | First day |
| end_date | date | No | Multi-day events; must not be before date |
| start | time | No | |
| end | time | No | Not allowed without start |
| speaker | text | No | |
| speaker_native | text | No | |
| speaker_affiliation | text | No | |
| speaker_url | URL | No | |
| speaker_photo | file name | No | Portrait in public/photos/; same filename rules as lab photos |
| junior_speaker | object | No | Optional early-career talk; sub-fields: name (required), affiliation, title |
| host_lab | text | No | Id of a file in data/labs/ |
| host_institution | text | No | Fallback when host_lab is absent |
| location | text | No, default Online | Or a room and campus |
| location_url | URL | No | Makes the venue name a link |
| platform | text | No | |
| registration_url | URL | No | |
| recording | object | No | Optional URL sub-fields: bilibili, youtube, other |
| slides_url | URL | No | |
| materials_url | URL | No | |
| poster | boolean | No, default `true` | Set `false` to omit the poster page and link |

Minimal complete example:

```markdown
---
title: A normative model of auditory prediction errors
date: 2027-02-12
start: "16:00"
end: "17:00"
---

The abstract goes here.
```

## Tutorials

Location: `data/tutorials/<slug>.yml`. An index entry; the material stays where its authors host it.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | text | Yes | |
| authors | list of text | Yes | At least one, none empty |
| lab | text | No | Id of a file in data/labs/ |
| format | notebook, slides, video, course, book, software, dataset or other | No, default other | |
| level | introductory, intermediate or advanced | No, default introductory | |
| language | English, Chinese, Bilingual or Other | No, default English | |
| url | URL | Yes | |
| doi | text | No | Not checked |
| topics | list of text | Yes | 1 to 8 items, none empty |
| description | text | No | At most 700 characters |
| added | date | Yes | |

Minimal complete example:

```yaml
title: Fitting drift-diffusion models
authors:
  - Jane Doe
url: https://github.com/doelab/ddm-tutorial
topics:
  - decision making
added: 2026-09-03
```

## Positions

Location: `data/positions/<slug>.md`. The body describes the project and how to apply.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | text | Yes | |
| type | phd, postdoc, research-assistant, faculty, internship or other | No, default other | |
| lab | text | No | Id of a file in data/labs/ |
| pi | text | No | |
| institution | text | Yes | |
| city | text | Yes | Any city; no GBA check |
| url | URL | No | |
| contact_email | email | No | |
| posted | date | Yes | |
| deadline | date | No | "Open until filled" if absent |
| expires | date | No | Hides the listing; defaults to deadline |

Minimal complete example:

```markdown
---
title: Postdoctoral fellow in computational neuroscience
institution: Southern University of Science and Technology
city: Shenzhen
posted: 2026-09-03
---

Two or three sentences and a link to the full advertisement.
```

## News

Location: `data/news/YYYY-MM-DD-slug.md`. The body is the text.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | text | Yes | |
| date | date | Yes | Newest first on the site |

Minimal complete example:

```markdown
---
title: The network is forming
date: 2026-09-03
---

One or two paragraphs.
```

## Docs

Location: `docs/<slug>.md`. The Documents page lists public docs, then coordinator docs, sorted by order then title; only public docs appear on the About page.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | text | Yes | |
| summary | text | No | Shown on the Documents page |
| audience | public or coordinators | No, default public | |
| order | whole number | No, default 100 | Lower comes first |

Minimal complete example:

```markdown
---
title: Speaker kit
---

The text of the document.
```

## Network settings

Location: `data/network.yml`, one file edited by coordinators and parsed once at build time; it is not a collection.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| name | text | Yes | Full name of the network |
| short_name | text | Yes | |
| acronym | text | Yes | |
| name_native | text | No | |
| stage | founding or active | No, default founding | Controls founding-stage wording and homepage statistics |
| tagline | text | Yes | |
| tagline_native | text | No | |
| pitch | text | No | Short description of how the network works |
| mission | text | Yes | |
| status_banner | text | No | Optional notice; plain HTML allowed; omitted on pages that hide the banner |
| founded | whole number | Yes | Year |
| contact_email | email or empty | No, default empty | Empty falls back to GitHub issues |
| mailing_list_url | URL or empty | No, default empty | Optional newsletter subscription page |
| repo_url | URL | Yes | Builds the issue-form links |
| seminar | object | Yes | Required: slot, platform. Optional: proposed (yes/no, default false), fallback_platform, recording_note |
| coordinators | list of people | No, default empty | Required: name, institution, role (at most 30 characters). Optional: name_native, role_detail, url, email |
| host_institutions | list of text | No, default empty | |

A minimal file has name, short_name, acronym, tagline, mission, founded, repo_url and a seminar block with slot and platform.

## Drafts and examples

An entry with `draft: true` is validated like any other but never published on the site or on a poster. The labs, events, tutorials and positions folders hold example drafts such as `data/labs/example-lab.yml`. To add an entry by hand, copy the example, rename it, fill it in and delete the `draft: true` line. Leave the examples in place.

## How validation works

The build checks each file against its schema. If validation fails, the build stops and that version is not published. The error identifies the collection, entry and field to correct. For example, an invalid start time prompts: `Use 24-hour HH:MM, quoted, e.g. "16:00"`.

Correct the named field and submit the change again. Network settings are validated in the same way. Unknown fields are ignored. Defaults apply when a field is absent, not when it is present but empty.

## Photos

A lab photo is a square head-and-shoulders image at `public/photos/<lab-id>.webp`, named after the lab file. The intake workflow makes it from the form's attachment: 400 by 400, WebP, metadata stripped. By hand, keep it under 100 KB and put the same name in the lab's `photo` field. The schema checks only the name pattern, not that the file exists, so a typo gives a broken image rather than a build error. Licence and consent rules are in [Privacy and consent](../privacy-and-consent/).

## References between files

`host_lab` (events) and `lab` (tutorials, positions) hold a lab id, the lab's file name without `.yml`. The schema does not check that it exists. If it does, the page shows the lab name and institution from the lab file; if not, the site falls back to `host_institution` (events) or `institution` (positions), and a tutorial shows no lab. A misspelled id is silent, so check the [labs list](../../labs/) for the exact id first.

## Dates, times and the weekly rebuild

All times are Hong Kong Time (UTC+8, no daylight saving). An event ends at `end` on its last day. An event with a `start` but no `end` or `end_date` ends one hour after it starts; otherwise, with no `end`, it ends at the end of its last day. It counts as upcoming until then. A position is listed until one day after `expires`, or after `deadline` if there is no expiry; with neither it stays until removed.

These lists are computed at build time. The site rebuilds after merged changes and every Monday. An event may therefore remain under upcoming, or an expired position may remain visible, until the next build. The [events](../../events/) and [positions](../../positions/) pages refresh together.
