# Greater Bay Area Computational and Cognitive Neuroscience Network

**GBA-CCN · 粤港澳大湾区计算神经科学与认知神经科学网络**

Welcome. We are labs across Hong Kong, Shenzhen, Guangzhou, Macau and the wider
Greater Bay Area that study the brain with computational and cognitive methods.
Apart, each of us is a few people in one department. Together we can fill a
seminar room, invite the speakers we all want to hear, find collaborators an
hour's train ride away, and pass on training and opportunities that would
otherwise stay inside one building.

**Website:** <https://xbtinchina.github.io/Greater-bay-CCN-association/>

**The network is forming right now.** That is the best moment to arrive: the
founding labs decide the seminar format, ratify the charter and set the tone.
Nothing here is settled, and your name on the roster is worth more today than
it will be once everything is already running.

This repository is the whole network in the open: the website, the roster, the
rules and the automation. Every lab entry, every event and every rule is a file
you can read, question and change by pull request. There is no hidden layer.

---

## Come in through any door

**Lead a lab in the region?** [List it](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=lab.yml).
That is the single most useful thing you can do, and it takes about five minutes.

**Not a PI?** You are just as welcome. Students, postdocs and research staff
need no application at all: subscribe to the
[calendar feed](https://xbtinchina.github.io/Greater-bay-CCN-association/calendar.ics)
and come to the talks. Nominating a speaker is open to anyone.

**Elsewhere in the world but working with people here?** Join as an affiliate
lab through the same form.

| I want to… | How |
|---|---|
| **List my lab** (PIs) | [Lab submission form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=lab.yml) |
| **Suggest a speaker** | [Speaker nomination](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=speaker-nomination.yml) |
| **Follow the seminars** | Subscribe to the [calendar feed](https://xbtinchina.github.io/Greater-bay-CCN-association/calendar.ics) |
| Announce a seminar, workshop or summer school | [Event form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=event.yml) |
| Share a tutorial or course | [Tutorial form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=tutorial.yml) |
| Post a PhD, postdoc or RA opening | [Position form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=position.yml) |

Each form turns your answers into a pull request automatically. A coordinator
reads it, usually within a few days, and the entry appears when it is merged.

The forms linked above need a free GitHub account. Nobody should be excluded
because of a tool, so the site also carries the same forms as ordinary web
forms that need no account, under `/forms/`, once a coordinator has switched
them on (see [docs/web-forms.md](docs/web-forms.md)). They ask the same
questions and end in the same place: a public entry in this repository that a
coordinator reads and merges. Sending one needs no account, so nothing can
write back to you either; the page gives you a link to your entry, and that
link is where any question about it appears. Until the forms are switched on,
ask a colleague to submit for you; a plain email route is being set up as well
and will appear on the site's About page.

Speaker nominations are read by the coordinators and never published on the
site. They are GitHub issues in a public repository, though, so write only what
the nominee could read.

## Help make this better

The site and this repository belong to the network, not to whoever happened to
set them up. Improvements are wanted, and small ones are as welcome as large
ones. **You do not need to be a programmer.**

**Things that need no code at all**

- Tell us what is confusing. If a page did not answer your question, that is a
  bug in our writing. [Open an issue](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new)
  and say so plainly.
- **Test from a mainland network.** Open the site, the calendar feed and a form
  from a campus network or mobile carrier in Shenzhen or Guangzhou and report
  what loads and what does not. This is genuinely useful and nobody else can do
  it for us.
- **Translate.** The site is English by default so that everyone can attend the
  same events. A Chinese version of the home page and the join page would help
  recruitment; we have deliberately not decided between Simplified and
  Traditional, and would rather hear from members than choose alone.
- Improve the wording of the [charter](docs/charter.md) or any document. They
  are Markdown files; propose a change like any other.
- Suggest a speaker, a tutorial worth indexing, or an event we have missed.

**Things that need a little code**

- Design and front-end polish: typography, spacing, dark mode, print styles.
- Accessibility: test with a screen reader or keyboard only and tell us what
  breaks.
- The intake script, the workflows, the calendar feed, the poster renderer.
- **Deploy the account-free web forms.** They are written and waiting; someone
  needs to create the GitHub App, deploy the small endpoint behind them with its
  rate limit, and set one line in `data/network.yml`. It is an afternoon's work
  and it removes the last reason anyone needs a GitHub account to join.
  [docs/web-forms.md](docs/web-forms.md) is the recipe, step by step.

**New to git or GitHub?** That is fine, and it is not a reason to stay quiet.
Every content file has an `example-*` template beside it to copy, GitHub can
edit files in the browser, and an imperfect pull request is easy to fix
together. Ask in an issue if you are stuck; explaining things is part of the
work, not an interruption to it.

Everyone taking part is covered by the [code of conduct](docs/code-of-conduct.md).
It is short, and we mean it.

## What the network is, in five points

1. **A network, not a society.** No legal entity, no fees, no president. A small
   group of coordinators, one per participating institution where possible,
   keeps things running. If a legal form is ever needed, that will be decided
   openly and recorded in the [charter](docs/charter.md).
2. **Membership is by lab.** *Member labs* are PI-led groups at institutions in
   the Greater Bay Area. *Affiliate labs* elsewhere take part and are listed
   with a badge. Every entry is reviewed by a coordinator before it appears.
3. **A joint seminar series with rotating hosts.** Proposed slot: alternate
   Thursdays, 16:00–17:00 Hong Kong Time, online on Zoom with Tencent Meeting as
   fallback, subject to confirmation by the founding labs. Each talk is hosted
   by one member lab, which invites the speaker on behalf of the whole network.
4. **English is the default working language,** so that researchers across
   institutions can take part in the same events. Names may appear in Chinese
   and English, and training material may be contributed in either language when
   clearly labelled.
5. **Designed to minimise cross-border dependencies.** No Google fonts,
   analytics or third-party scripts, and recordings go to both Bilibili and
   YouTube. GitHub Pages is still a single point of failure, which is why the
   testing above matters.

## What is in this repository

```
.
├── data/                  All content, one file per entry (CC BY 4.0)
│   ├── network.yml        Name, mission, seminar slot, coordinators, contact
│   ├── labs/              One YAML file per lab          → /labs/
│   ├── events/            Seminars, workshops, schools   → /events/, /calendar.ics
│   ├── tutorials/         Training index (links only)    → /resources/
│   ├── positions/         Openings; expire automatically → /positions/
│   └── news/              Announcements                  → /news/
├── docs/                  Charter, code of conduct, handbooks → /docs/
├── brand/logo.png         The logo; scripts/brand.mjs derives the rest
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

Each `data/` folder contains an `example-*` file marked `draft: true`. Drafts are
validated by the build but never published, so the examples double as templates.
The field-by-field reference is in [docs/data-model.md](docs/data-model.md).

### Documents

| Document | For |
|---|---|
| [Charter](docs/charter.md) | Everyone. Purpose, membership tiers, coordinators, delisting, amendments. A draft, for ratification by the founding labs. |
| [Code of conduct](docs/code-of-conduct.md) | Everyone at any event or in any channel. |
| [Privacy and consent](docs/privacy-and-consent.md) | Everyone. What is published, on what basis, how to remove it. |
| [Speaker kit](docs/speaker-kit.md) | Invited speakers. Format, platform, recording, what we need and when. |
| [Hosting a seminar](docs/hosting-a-seminar.md) | The member lab hosting a talk. Checklist with a timeline. |
| [Invitation letter template](docs/invitation-letter-template.md) | Hosts. Invitation, logistics and announcement templates. |
| [Operations handbook](docs/operations.md) | Coordinators. How the machinery runs and what humans do. |
| [Web forms](docs/web-forms.md) | Coordinators. The account-free forms: the GitHub App, the endpoint, switching them on and off. |
| [Data model](docs/data-model.md) | Contributors. Every field of every file. |

## How the site works

A static [Astro](https://astro.build) project deployed to GitHub Pages by GitHub
Actions. No server, no database: the pages are generated from the files in
`data/` and `docs/` at build time.

- **A founding stage.** With `stage: founding` in `data/network.yml`, the home
  page is a recruitment page: no counters, "founding labs", the seminar slot
  marked as proposed. Switch to `active` once the numbers signal traction rather
  than fragility. The Resources page appears in the navigation only when it has
  content; Positions is always there so labs can post openings; the lab filters
  render only once eight labs are listed.
- **The logo.** Replace `brand/logo.png` (dark artwork on white) and run
  `node scripts/brand.mjs`. It writes the header mark and its dark-mode variant,
  the lockup on the About page, the favicons and the sharing image; the pages
  pick them up at the next build.
- **Ordinary routes alongside GitHub.** Set `contact_email` and, if you run one,
  `mailing_list_url`, and the site offers pre-filled email for joining,
  following and nominating, with the GitHub forms as the open alternative.
  Nominations by email stay private; the GitHub route is a public issue. Set
  `submit_url` as well and the site's own forms under `/forms/` come to life,
  so that nobody needs an account at all; empty it and they go away again.
  [docs/web-forms.md](docs/web-forms.md) has the deployment recipe.
- **Schemas catch mistakes.** Each collection has a schema in
  `src/content.config.ts`. A misspelt field, a missing date or a member lab in a
  city outside the region fails the build with a message naming the file and the
  field, so nothing broken reaches the site. A failed check is information, not
  a reprimand.
- **Time-based lists refresh weekly.** Upcoming versus past events and expired
  positions are computed at build time. The deploy workflow rebuilds the site
  every Monday morning Hong Kong time as well as on every change.
- **The calendar feed** at `/calendar.ics` is generated from the events data.
  Subscribe once and every new talk appears in your calendar.
- **Posters** are generated too. Every event has a `/events/<id>/poster/` view at
  1080 × 1350 px; the *Render poster* workflow turns it into a PNG for WeChat
  and mailing lists.
- **Base path.** The deploy workflow passes the site origin and base path in from
  GitHub, so renaming the repository or moving it to an organisation needs no
  code change.

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

`npm run build` is the same check that runs on every pull request, so if it
passes locally you are almost certainly fine. See
[CONTRIBUTING.md](CONTRIBUTING.md) for conventions.

## Setup checklist for maintainers

Things only a repository owner can do, in the order they matter:

1. **Set the GitHub Pages source to GitHub Actions** in *Settings → Pages*. The
   other option, *Deploy from a branch*, runs GitHub's Jekyll build, which
   cannot build this site and fails on every push. Once the source is right, the
   next push to `main`, or a manual run of *Deploy site*, publishes the site.
2. **Run the *Create labels* workflow** once from the Actions tab so the forms
   can label issues.
3. **Allow Actions to open pull requests**: *Settings → Actions → General →
   Workflow permissions*, tick *Allow GitHub Actions to create and approve pull
   requests*. Without it every form submission fails at its last step.
4. **Set a role address** in `data/network.yml` (`contact_email`), and a
   subscription page for the announcement list (`mailing_list_url`) if you run
   one. Email routes for joining, following and nominating appear on the site as
   soon as the address exists.
5. **Switch on the web forms** so that joining needs no GitHub account: create
   the network's GitHub App with Issues permission only, deploy the endpoint
   with its rate limit, and set `submit_url` in `data/network.yml`. Clearing
   that line stops the site offering the forms; closing the endpoint itself
   takes one more step, which the guide gives. Submissions then arrive as
   issues opened by the App rather than by a person, so when the automated
   check rejects one, fixing it is a coordinator's job and not the submitter's.
   Step by step in [docs/web-forms.md](docs/web-forms.md), including how to
   test reachability from mainland networks before advertising them.
6. **Fix the repository description** in the repository's *About* box; it still
   says "Great Bay Area".
7. **Recruit the founding cohort and schedule a founding roundtable** before any
   invited seminar: each founding lab introduces itself in three minutes, then
   the seminar format and the charter are discussed. Add it as the first event,
   and add conveners to `coordinators` in `data/network.yml` as they confirm,
   with their permission.
8. **Move the repository to a GitHub organisation** once there are two or more
   coordinators, so the site URL and ownership stop being personal. Give at
   least two people owner rights. GitHub redirects the old repository URL and
   the deploy workflow adapts to the new site URL automatically; only the
   `repo_url` in `data/network.yml` and the links in this file need updating. A
   neutral custom domain lets the hosting change later without changing the
   public identity.
9. **Test from mainland networks**, or ask members to (see above). Test the web
   forms and their endpoint the same way before advertising them. If GitHub
   Pages proves unreliable, mirror the built site to a second host.
10. **Protect `main`** so that changes arrive by pull request. Do not make *Build
    check* a required status check: pull requests opened by the intake workflow
    cannot trigger it (GitHub's rule for bot tokens), which is why the intake
    workflow runs the same build itself before opening them.
11. **Ratify the charter.** It is marked as a draft until the founding labs have
    agreed it.
12. **Switch `stage` to `active`** in `data/network.yml` once roughly six to ten
    labs across three or more institutions, on both sides of the border, have
    joined and one event is scheduled; edit or remove `status_banner` at the same
    time. The counters return and the "proposed" wording goes.
13. **Check the seeded lab entry.** `data/labs/xiangbin-teng.yml` was drafted
    from the founding chat rather than submitted through the form; the PI should
    verify the department, keywords and description.

## Licences

Code is MIT ([LICENSE](LICENSE)). Text content, meaning everything under `data/`
and `docs/` and the text of the site, is CC BY 4.0
([LICENSE-CONTENT.md](LICENSE-CONTENT.md)). Photos are displayed with permission
only and are not licensed for reuse. Personal data in the roster is published
with the consent of the people concerned and can be corrected or removed on
request; see [docs/privacy-and-consent.md](docs/privacy-and-consent.md).

---

Thank you for reading this far. If you take one action today, make it
[listing your lab](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=lab.yml)
or telling a colleague across the bay that this exists.
