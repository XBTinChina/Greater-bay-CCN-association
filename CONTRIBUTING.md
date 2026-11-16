# Contributing

Contributions are welcome. Most content is a data file or a Markdown document,
so you do not need programming experience to suggest a change.

## Adding or changing content

**Use the forms.** Lab, event, resource and position forms create a pull request
for a coordinator to review. Speaker nominations create a public issue for
discussion and do not create a website listing. The forms need a GitHub account;
if you need help, ask a colleague or a coordinator listed on the About page.

| I want to… | Form |
|---|---|
| List my lab | [Lab submission](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=lab.yml) |
| Announce a seminar, workshop or summer school | [Event](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=event.yml) |
| Add a tutorial or course to the learning index | [Tutorial](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=tutorial.yml) |
| Post a research or teaching position | [Position](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=position.yml) |
| Suggest a speaker | [Speaker nomination](https://github.com/XBTinChina/Greater-bay-CCN-association/issues/new?template=speaker-nomination.yml) |

**Or edit the files directly.** Entries are stored under `data/`. The labs,
events, tutorials and positions folders include example files to copy.
The field reference is in `docs/data-model.md`. Open a pull request so a
coordinator can review the content and the build can check its format.

Entries with `draft: true` are validated but not published. Remove that line
when the entry is ready.

## Editing the documents

The charter, code of conduct and handbooks live in `docs/`. Changes to the
charter follow the amendment process it describes; everything else is an
ordinary pull request. Write plainly and concretely, in English.

## Working on the site

Use Node 22.12.0 or a compatible newer version.

```bash
npm ci          # install
npm run dev     # local preview at http://localhost:4321/Greater-bay-CCN-association/
npm run build   # full build and validation of all data files
node scripts/test-intake.mjs
```

The site is a static [Astro](https://astro.build) project. Content schemas
are in `src/content.config.ts`; controlled vocabularies (cities, event types,
and so on) are in `src/lib/taxonomy.ts`. Internal links go through the `url()`
helper so that the site works under any base path.

Keep these requirements in mind:

- **Keep page assets local.** Do not add external fonts, analytics or third-party
  scripts. This reduces dependencies and helps access across different networks.
- **No large binaries.** Recordings, slide decks and datasets are linked, not
  committed. Photos go through the intake pipeline, which produces small WebP files.
- **Protect private information.** Do not include private meeting links,
  passcodes or personal correspondence in public files. Submission forms accept
  public event or registration pages, not direct meeting links or passcodes.

## Reviewing (coordinators)

Use the pull request checklist. For a lab listing, confirm its membership
category, the PI's consent, any photo permission, research keywords and a
clear factual description. Follow the [operations handbook](docs/operations.md)
for the full review process.

## Conduct

The [code of conduct](docs/code-of-conduct.md) applies to everyone taking part.

## Licences

Contributed text is published under CC BY 4.0 and original project code under
MIT. Photos are displayed with permission, without a licence for reuse.
Third-party assets and data retain their source terms and attribution.
See `LICENSE` and `LICENSE-CONTENT.md`.
