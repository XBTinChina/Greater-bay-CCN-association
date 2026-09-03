# Greater Bay Area Computational and Cognitive Neuroscience Network

**GBA-CCN Network · 粤港澳大湾区计算与认知神经科学网络**

A network of labs across Hong Kong, Shenzhen, Guangzhou, Macau and the wider
Greater Bay Area that study the brain with computational and cognitive
methods. Together we run a joint seminar series, keep a public roster of
participating labs, share teaching material, and pool the audience that no
single department has on its own, so that any member lab can invite a speaker
on behalf of all.

**Website:** <https://xbtinchina.github.io/Greater-bay-CCN-association/>

**Status: forming.** The first labs are joining and the first seminar season
is being planned. If you lead a lab in the region, [join now](#take-part).

This repository is the network's entire public infrastructure: the website,
the data behind it, the documents it runs by, and the automation that keeps it
current. It is deliberately open. Every lab entry, every event and every rule
is a file here, and every change is a pull request anyone can read.

---

## What the network is, in five points

1. **A network, not a society.** No legal entity, no fees, no president. A
   small group of coordinators, one per participating institution where
   possible, keeps things running. If the network ever needs a legal form,
   that will be decided openly and recorded in the [charter](docs/charter.md).
2. **Membership is by lab.** *Member labs* are PI-led groups at institutions in
   the Greater Bay Area. *Affiliate labs* elsewhere take part and are listed
   with a badge. Every entry is reviewed by a coordinator before it appears.
   Students and postdocs need no application; they subscribe to the calendar
   feed and the announcement list.
3. **A joint seminar series with rotating hosts.** Proposed slot: alternate
   Thursdays, 16:00–17:00 Hong Kong Time, online on Zoom with Tencent Meeting
   as fallback, subject to confirmation by the founding labs. Each talk is
   hosted by one member lab, which invites the speaker on behalf of the whole
   network. Anyone can nominate a speaker.
4. **English as the working language.** It is the one language that belongs to
   nobody in a region whose labs work in Cantonese, Mandarin and English.
   Names may appear in native script beside the Latin form; teaching material
   may be in any language and is labelled.
5. **Designed to minimise cross-border dependencies.** The site loads no
   Google fonts, analytics or third-party scripts, and recordings are posted to
   both Bilibili and YouTube. GitHub Pages itself remains a single point of
   failure, so the setup checklist below asks for tests from mainland networks.

## Take part

Each link below is a short form. Your answers become a pull request
automatically; a coordinator reviews it and the entry goes live when merged.

| I want to… | Form |
|---|---|
| **List my lab** (PIs) | [Lab submission](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=lab.yml) |
| **Suggest a speaker** | [Speaker nomination](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=speaker-nomination.yml) |
| Announce a seminar, workshop or summer school | [Event](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=event.yml) |
| Add a tutorial or course to the learning index | [Tutorial](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=tutorial.yml) |
| Post a PhD, postdoc or RA opening | [Position](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=position.yml) |
| Follow the seminars | Subscribe to the [calendar feed](https://xbtinchina.github.io/Greater-bay-CCN-association/calendar.ics) |

The forms need a free GitHub account. If that is a problem, ask a colleague to
submit on your behalf; a contact address will be added to the site's About page.

Speaker nominations are read by the coordinators and never published on the
site. They are GitHub issues in a public repository, so write only what the
nominee could read.

## What is in this repository

```
.
├── data/                  All content, one file per entry (CC BY 4.0)
│   ├── network.yml        Name, mission, seminar slot, coordinators, contact
│   ├── labs/              One YAML file per lab          → /labs/
│   ├── events/            Seminars, workshops, schools   → /events/, /calendar.ics
│   ├── tutorials/         Training index (links only)    → /resources/
│   ├── positions/         Openings; expire automatically → /resources/
│   └── news/              Announcements                  → /news/
├── docs/                  Charter, code of conduct, handbooks → /docs/
├── public/photos/         PI photos, 400×400 WebP, metadata stripped
├── src/                   The Astro site (MIT)
│   ├── content.config.ts  Schemas: what each data file must contain
│   ├── lib/taxonomy.ts    Controlled vocabularies: cities, event types, …
│   ├── pages/             One file per route, plus calendar.ics and posters
│   └── ...
├── scripts/               Intake: turns a submitted form into a data file
└── .github/
    ├── ISSUE_TEMPLATE/    The forms
    └── workflows/         Deploy, build check, intake, weekly digest, poster, labels
```

Each `data/` folder contains an `example-*` file marked `draft: true`. Drafts
are validated by the build but never published, so the examples double as
templates. The field-by-field reference is in [docs/data-model.md](docs/data-model.md).

### Documents

| Document | For |
|---|---|
| [Charter](docs/charter.md) | Everyone. Purpose, membership tiers, coordinators, delisting, amendments. Draft, for ratification by the founding labs. |
| [Code of conduct](docs/code-of-conduct.md) | Everyone at any event or in any channel. |
| [Privacy and consent](docs/privacy-and-consent.md) | Everyone. What is published, on what basis, how to remove it. |
| [Speaker kit](docs/speaker-kit.md) | Invited speakers. Format, platform, recording, what we need and when. |
| [Hosting a seminar](docs/hosting-a-seminar.md) | The member lab hosting a talk. Checklist with a timeline. |
| [Invitation letter template](docs/invitation-letter-template.md) | Hosts. Invitation, logistics and announcement templates. |
| [Operations handbook](docs/operations.md) | Coordinators. How the machinery runs and what humans do. |
| [Data model](docs/data-model.md) | Contributors. Every field of every file. |

## How the site works

The site is a static [Astro](https://astro.build) project deployed to GitHub
Pages by GitHub Actions. There is no server and no database: the pages are
generated from the files in `data/` and `docs/` at build time.

- **A founding stage.** With `stage: founding` in `data/network.yml`, the home
  page is a recruitment page: no counters, "founding labs", the seminar slot
  marked as proposed. Switch to `active` once the numbers signal traction
  rather than fragility. The Resources page appears in the navigation only
  when it has content, and the lab filters only once eight labs are listed.
- **Ordinary routes alongside GitHub.** Set `contact_email` and, if you run
  one, `mailing_list_url`, and the site offers pre-filled email for joining,
  following and nominating, with the GitHub forms as the open alternative.
  Nominations by email stay private; the GitHub route is a public issue.
- **Schemas catch mistakes.** Each collection has a schema in
  `src/content.config.ts`. A misspelt field, a missing date or a member lab in
  a city outside the region fails the build with a message naming the file and
  field, so nothing broken reaches the site.
- **The home page is built for one reader:** an invited speaker doing a
  ten-second check before replying. Name, participating institutions, number
  of labs, next seminar, recent speakers.
- **Time-based lists refresh weekly.** Upcoming versus past events and expired
  positions are computed at build time. The deploy workflow rebuilds the site
  every Monday morning Hong Kong time as well as on every change.
- **The calendar feed** at `/calendar.ics` is generated from the events data.
  Subscribe once and every new talk appears in your calendar.
- **Posters** are generated too. Every event has a `/events/<id>/poster/` view
  at 1080 × 1350 px; the *Render poster* workflow turns it into a PNG for
  WeChat and mailing lists.
- **Base path.** The deploy workflow passes the site origin and base path in
  from GitHub, so renaming the repository or moving it to an organisation
  needs no code change.

## How the automation works

Automatic intake, human approval. Nothing is published without a coordinator
merging a pull request, because the roster is only worth something as a
credential if every entry has been looked at.

| Workflow | Trigger | What it does |
|---|---|---|
| **Intake submissions** | An issue form is submitted or edited | Parses the form, processes the photo, writes the data file, validates it by building the site, and opens a pull request on branch `intake/issue-<n>` that closes the issue. On failure it comments on the issue with the error and adds the label `needs-changes`. |
| **Build check** | Any pull request | Builds the site so a hand-edited file is validated before merge. |
| **Deploy site** | Push to `main`, every Monday, or by hand | Builds and publishes to GitHub Pages. |
| **Weekly digest** | Every Monday, or by hand | Checks every link on the site and opens or updates a digest issue listing pending submissions, open intake pull requests and broken links. |
| **Render poster** | By hand, with an event id | Screenshots the poster view into a PNG artifact. |
| **Create labels** | By hand, once | Creates the labels the forms and workflows rely on. |

Labels: `intake`, `intake:lab`, `intake:event`, `intake:tutorial`,
`intake:position`, `speaker-nomination`, `needs-changes`, `weekly-digest`,
`automation`.

The workflows use only official GitHub actions plus the lychee link checker,
never interpolate user-submitted text into shell commands, and cannot merge
anything. The [operations handbook](docs/operations.md) describes the weekly
routine around them.

## Local development

You need Node 22 or newer.

```bash
npm ci
npm run dev      # http://localhost:4321/Greater-bay-CCN-association/
npm run build    # builds into dist/ and validates every data file
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions.

## Setup checklist for maintainers

Things that only a repository owner can do, in the order they matter:

1. **Set the GitHub Pages source to GitHub Actions** in *Settings → Pages*.
   The other option, *Deploy from a branch*, runs GitHub's Jekyll build, which
   cannot build this site and fails on every push. Once the source is right,
   the next push to `main`, or a manual run of *Deploy site*, publishes the site.
2. **Run the *Create labels* workflow** once from the Actions tab so the forms
   can label issues.
3. **Allow Actions to open pull requests**: *Settings → Actions → General →
   Workflow permissions*, tick *Allow GitHub Actions to create and approve
   pull requests*. Without it every form submission fails at its last step.
4. **Set a role address** in `data/network.yml` (`contact_email`), and a
   subscription page for the announcement list (`mailing_list_url`) if you run
   one. Email routes for joining, following and nominating appear on the site
   as soon as the address exists; until then only the GitHub forms and the
   calendar feed are offered.
5. **Fix the repository description** in the repository's *About* box; it
   still says "Great Bay Area".
6. **Recruit the founding cohort and schedule a founding roundtable** before
   any invited seminar: each founding lab introduces itself in three minutes,
   then the seminar format and the charter are discussed. Add it as the first
   event, and add conveners to `coordinators` in `data/network.yml` as they
   confirm, with their permission.
7. **Move the repository to a GitHub organisation** once there are two or
   more coordinators, so the site URL and ownership stop being personal. Give
   at least two people owner rights. GitHub redirects the old repository URL
   and the deploy workflow adapts to the new site URL automatically; only the
   `repo_url` in `data/network.yml` and the links in this file need updating.
   A neutral custom domain lets the hosting change later without changing
   the public identity.
8. **Test from mainland networks.** Open the home page, the calendar feed and
   a form from Shenzhen and Guangzhou campus networks and mobile carriers. If
   GitHub Pages proves unreliable, mirror the built site to a second host.
9. **Protect `main`** so that changes arrive by pull request. Do not make
   *Build check* a required status check: pull requests opened by the intake
   workflow cannot trigger it (GitHub's rule for bot tokens), which is why the
   intake workflow runs the same build itself before opening them.
10. **Ratify the charter.** It is marked as a draft until the founding labs
    have agreed it.
11. **Switch `stage` to `active`** in `data/network.yml` once roughly six to
    ten labs across three or more institutions, on both sides of the border,
    have joined and one event is scheduled; edit or remove `status_banner` at
    the same time. The counters return and the "proposed" wording goes.
12. **Check the seeded lab entry.** `data/labs/xiangbin-teng.yml` was drafted
    from the founding chat rather than submitted through the form; the PI
    should verify the department, keywords and description.

## Licences

Code is MIT ([LICENSE](LICENSE)). Text content, meaning everything under
`data/` and `docs/` and the text of the site, is CC BY 4.0
([LICENSE-CONTENT.md](LICENSE-CONTENT.md)). Photos are displayed with
permission only and are not licensed for reuse. Personal data in the roster is
published with the consent of the people concerned and can be corrected or
removed on request; see [docs/privacy-and-consent.md](docs/privacy-and-consent.md).
