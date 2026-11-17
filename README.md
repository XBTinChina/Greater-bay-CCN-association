# Greater Bay Area Computational and Cognitive Neuroscience Network

**GBA-CCN · 粤港澳大湾区计算神经科学与认知神经科学网络**

We connect labs studying brains, behaviour and computation across the Greater
Bay Area. The network supports shared seminars, research collaboration,
training resources and research opportunities. Students, research staff,
postdocs, faculty and other interested participants are welcome.

**Website:** <https://xbtinchina.github.io/Greater-bay-CCN-association/>

**The network is in its founding stage.** Participating labs can help develop
the programme and review the draft charter. The usual seminar slot is the
second Friday of each month. Check each event page for its confirmed date and time.

This public repository contains the website, lab directory, event listings,
documents and automation. Suggest corrections through an issue or a pull request.
Charter changes follow the process described in the charter. Subscriber
information and private correspondence are kept outside the repository.

## Take part

**Lead a lab in the Greater Bay Area?** Use the
[lab submission form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=lab.yml)
to apply for a member lab listing. Labs elsewhere can apply as affiliates through
the same form.

**Want to attend or follow the network?** No membership application is needed.
The optional [newsletter](https://buttondown.com/gba-ccn) shares seminars,
events, open positions and network news. Anyone can suggest a speaker.

| I want to… | How |
|---|---|
| List my lab | [Lab submission form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=lab.yml) |
| Suggest a speaker | [Speaker nomination](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=speaker-nomination.yml) |
| Receive news and announcements | [Newsletter signup](https://buttondown.com/gba-ccn) |
| Announce a seminar, workshop or summer school | [Event form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=event.yml) |
| Share a resource | [Resource submission form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=tutorial.yml) |
| Post a research or teaching opening | [Position form](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=position.yml) |

Lab, event, resource and position forms create a pull request for a coordinator
to review. Approved entries appear after the pull request is merged and the
site is rebuilt. Speaker nominations create an issue for the coordinators,
not a website listing.

The forms need a free GitHub account. If you cannot use GitHub, ask a colleague
to submit with your permission, or contact a coordinator listed on the
[About page](https://xbtinchina.github.io/Greater-bay-CCN-association/about/).
GitHub issues are public, including speaker nominations. Include only information
you are comfortable sharing publicly.

## Help improve the network

Suggestions and corrections are welcome. You do not need programming experience.

- Report unclear wording, missing information or access problems by
  [opening an issue](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new).
- Test the site and newsletter signup from different networks in the region.
- Suggest translations or other language support. English is the site's default language.
- Propose wording changes to the [charter](docs/charter.md) or other documents.
- Suggest speakers, resources and events.
- Help test keyboard access, screen readers, mobile layouts or print views.
- Improve the site, submission tools or poster renderer.

You can edit files in the GitHub website. The labs, events, tutorials and
positions folders include example entries. Ask a coordinator if you need help
with a form or pull request. The [code of conduct](docs/code-of-conduct.md)
applies to everyone taking part.

## How the network works

1. **An informal academic network.** There are no membership fees. A small group
   of coordinators supports its activities, with one per participating institution
   where possible. The network is not a separate legal entity. Any change to its
   structure would be discussed and recorded in the [charter](docs/charter.md).
2. **Membership is by lab.** Member labs are PI-led groups at institutions in the
   Greater Bay Area. Affiliate labs elsewhere take part and are identified on the
   directory. A coordinator reviews each entry before publication. Individuals
   can attend events and receive announcements without joining a lab listing.
3. **Seminars have rotating hosts.** The usual slot is the second Friday of each
   month, 16:00–17:00 Hong Kong Time, online on Zoom with Tencent Meeting as a
   fallback. The plan is one seminar a month. Member labs take turns as hosts;
   the time between turns depends on the number of labs. Check individual event
   pages for confirmed dates and details.
4. **English is the default working language.** Names in other scripts are welcome
   alongside Latin-script names. Resources can be in any language; each listing
   identifies its language.
5. **Access across the region matters.** The site loads no external fonts,
   analytics or third-party scripts. With speaker consent, recordings are shared
   through Bilibili and YouTube. Access to GitHub Pages and other services can
   vary, so reports of access problems help us improve the site.

## Repository contents

| Location | Contents |
|---|---|
| `data/network.yml` | Network name, mission, usual seminar slot, coordinators and contact routes |
| `data/labs/` | Lab listings, shown at `/labs/` |
| `data/events/` | Events, shown at `/events/` |
| `data/tutorials/` | Links to learning resources, shown at `/resources/` |
| `data/positions/` | Openings, shown at `/positions/` until their removal date |
| `data/news/` | Network announcements, shown at `/news/` |
| `docs/` | Charter, code of conduct and guidance, shown at `/docs/` |
| `public/photos/` | PI and speaker photos; the lab intake workflow produces 400 × 400 WebP images with metadata removed |
| `src/` | Astro pages, components, styles and content schemas |
| `scripts/` | Submission processing, validation and poster generation |
| `.github/` | Submission forms, review template and workflows |

The labs, events, tutorials and positions folders include an example marked
`draft: true`. Drafts are validated but not published. See
[the data model](docs/data-model.md) for the fields in each file.

### Documents

| Document | Purpose |
|---|---|
| [Charter](docs/charter.md) | Purpose, membership, coordination and amendments. A draft awaiting approval by the founding labs. |
| [Code of conduct](docs/code-of-conduct.md) | Expectations for events and network channels. |
| [Privacy and consent](docs/privacy-and-consent.md) | What is published, consent and removal requests. |
| [Member guidelines](docs/member-guidelines.md) | Participation, hosting and keeping entries current. |
| [Speaker kit](docs/speaker-kit.md) | Format, platform, recording and preparation for speakers. |
| [Hosting a seminar](docs/hosting-a-seminar.md) | A host's preparation checklist. |
| [Invitation letter template](docs/invitation-letter-template.md) | Invitation, logistics and announcement templates. |
| [Newsletter templates](docs/newsletter-templates.md) | Event announcements, weekly updates, monthly summaries and positions, with shared links. |
| [Operations handbook](docs/operations.md) | Submission review, maintenance and announcements. |
| [Data model](docs/data-model.md) | Field reference for contributors. |

## How the site works

The site uses [Astro](https://astro.build) and is published to GitHub Pages by
GitHub Actions. Public pages are generated from `data/` and `docs/` at build time.
The site has no application database or visitor accounts.

- **Founding stage:** `stage: founding` in `data/network.yml` hides the homepage
  counters. `seminar.proposed` separately controls whether the usual seminar
  slot is described as proposed. Set the stage to `active` when the founding
  labs agree that the network is ready, and review the status banner at the same time.
- **Visual assets:** site colours are in `src/styles/global.css`. The header mark
  is in `src/assets/brand/network-mark.png`, the homepage artwork is in
  `src/assets/brand/neural-tides.webp`, and the regional map is in
  `public/greater-bay-area.svg`. The map records its source attribution.
  `npm run build` runs `scripts/blue-hour-brand.mjs` to generate icons and the sharing card.
- **Contact routes:** `contact_email` enables pre-filled email links for lab
  applications and speaker nominations. `mailing_list_url` supplies the newsletter
  signup link. Email correspondence is separate from public GitHub issues.
- **Validation:** schemas in `src/content.config.ts` check required fields, dates
  and allowed values. Review the content as well; a successful build does not
  establish that every statement or link is correct.
- **Scheduled updates:** upcoming events and expired positions are evaluated at
  build time. The site rebuilds on each change and every Monday morning in Hong
  Kong. Listings can therefore remain visible until the next build.
- **Newsletter:** coordinators send announcements manually through
  [Buttondown](https://buttondown.com/gba-ccn), using the [newsletter templates](docs/newsletter-templates.md).
  Check weekly and send only when there is something new or meaningfully changed to share.
  Publishing a website change does not send an email.
- **Posters:** event poster views are available at `/events/<id>/poster/` unless
  disabled for that event. The *Render poster* workflow produces a PNG for sharing.
- **Site address:** the deployment workflow supplies the origin and base path.
  Internal links use the `url()` helper.

## Automation

Submission processing is automated; publication requires review and merge.

| Workflow | Trigger | What it does |
|---|---|---|
| Intake submissions | A supported issue form is submitted or edited | Validates the entry, processes any photo and opens or updates a pull request. Errors are reported on the issue. Speaker nominations do not create data files. |
| Build check | A pull request | Builds the site and runs the submission tests. |
| Deploy site | Push to `main`, every Monday, or manual run | Builds and publishes the site. |
| Weekly digest | Every Monday, or manual run | Checks site links and reports submissions, open intake pull requests and link problems. |
| Render poster | Manual run with an event id | Creates a PNG from the event's poster view. |
| Create labels | Manual run during setup | Creates the labels used by forms and workflows. |

The intake workflows do not merge pull requests. The
[operations handbook](docs/operations.md) describes the review process.

## Local development

Use Node 22.12.0 or a compatible newer version.

```bash
npm ci
npm run dev      # http://localhost:4321/Greater-bay-CCN-association/
npm run build    # build and validate content
node scripts/test-intake.mjs
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for editing conventions.

## Maintainer checklist

1. Set the GitHub Pages source to **GitHub Actions** under *Settings → Pages*.
2. Run **Create labels** once so the forms can label submissions.
3. Under *Settings → Actions → General*, allow GitHub Actions to create pull
   requests. The intake workflow needs this permission.
4. Keep coordinator details, the newsletter signup address and any network contact
   address current in `data/network.yml`. Review the repository description and site links.
5. Confirm upcoming events with their hosts and add them to `data/events/`.
   Add coordinators only with their agreement. Use the event pages for confirmed dates.
6. Consider shared repository ownership as the network grows. If moving to an
   organisation, update `repo_url` and repository links, then check the published site.
7. Test access from different networks in the region. Consider a mirror if access
   problems persist.
8. Review branch protection with the workflow setup in mind. Intake pull requests
   created with GitHub's workflow token do not trigger another workflow; the
   intake workflow therefore runs the build before opening its pull request.
9. Keep the charter marked as a draft until the founding labs approve it.
10. Change `stage` to `active` when the founding labs agree. Review the banner,
    event schedule and contact details at the same time.
11. Ask labs to confirm that their entries remain accurate, following the
    process in the charter and member guidelines.

## Licences

Code is MIT ([LICENSE](LICENSE)). Text content is CC BY 4.0
([LICENSE-CONTENT.md](LICENSE-CONTENT.md)). Photos are displayed with permission
and are not licensed for reuse. Third-party material retains its source terms.
See [privacy and consent](docs/privacy-and-consent.md) for corrections and removal requests.
