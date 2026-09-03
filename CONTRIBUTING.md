# Contributing

Thank you for helping to build the network. Almost everything here is a data
file or a Markdown document, so most contributions need no code at all.

## Adding or changing content

**Use the forms.** They are GitHub issue forms; each one turns your answers
into a pull request automatically, and a coordinator reviews it.

| I want to… | Form |
|---|---|
| List my lab | [Lab submission](https://github.com/XBTinChina/Great-bay-CCN-association/issues/new?template=lab.yml) |
| Announce a seminar, workshop or summer school | [Event](https://github.com/XBTinChina/Great-bay-CCN-association/issues/new?template=event.yml) |
| Add a tutorial or course to the learning index | [Tutorial](https://github.com/XBTinChina/Great-bay-CCN-association/issues/new?template=tutorial.yml) |
| Post a PhD, postdoc or RA opening | [Position](https://github.com/XBTinChina/Great-bay-CCN-association/issues/new?template=position.yml) |
| Suggest a speaker | [Speaker nomination](https://github.com/XBTinChina/Great-bay-CCN-association/issues/new?template=speaker-nomination.yml) |

**Or edit the files directly.** Every entry is one file under `data/`, and
every folder contains an `example-*` file to copy. The field reference is in
`docs/data-model.md`. Open a pull request; the build check will validate your
file and tell you exactly which field is wrong if one is.

Entries with `draft: true` are validated but not published. Remove that line
when the entry is ready.

## Editing the documents

The charter, code of conduct and handbooks live in `docs/`. Changes to the
charter follow the amendment process it describes; everything else is an
ordinary pull request. Write plainly and concretely, in English.

## Working on the site

You need Node 22 or newer.

```bash
npm ci          # install
npm run dev     # local preview at http://localhost:4321/Great-bay-CCN-association/
npm run build   # full build and validation of all data files
```

The site is a static [Astro](https://astro.build) project. Content schemas
are in `src/content.config.ts`; controlled vocabularies (cities, event types,
and so on) are in `src/lib/taxonomy.ts`. Internal links go through the `url()`
helper so that the site works under any base path.

Two constraints matter more than any style rule:

- **No external resources.** No Google Fonts, analytics or third-party
  scripts. A good part of the audience is on mainland campuses where those
  never load.
- **No large binaries.** Recordings, slide decks and datasets are linked, not
  committed. Photos go through the intake pipeline, which produces small WebP files.

## Reviewing (coordinators)

The pull request template carries the checklist. The short version: is it a
real lab in the region (or a genuine affiliate), is consent ticked, is the
photo appropriate, are the keywords sensible, is the description free of
marketing. Merge when yes. The operations handbook in `docs/operations.md`
covers the rest.

## Conduct

Everyone taking part is bound by the [code of conduct](docs/code-of-conduct.md).

## Licences

By contributing content you agree to publish it under CC BY 4.0, and code under
MIT. See `LICENSE` and `LICENSE-CONTENT.md`.
