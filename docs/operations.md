---
title: Operations handbook
summary: How coordinators run the repository day to day, including the intake pipeline, what to check before merging, the Monday routine, and what to do when something breaks.
audience: coordinators
order: 60
---

This page is for the people who keep the site running. Everything on the site comes from files in one GitHub repository, submissions arrive through issue forms, and a workflow turns each submission into a pull request. Nothing is published until a coordinator merges that pull request, so the job is mostly reading, checking and merging, and this page says what to check. The field-by-field reference is the [data model](../data-model/); the seminar checklist is [hosting a seminar](../hosting-a-seminar/).

## The repository in brief

- `data/network.yml`: network-wide settings (name, mission, the status banner shown on every page, contact email, seminar slot and platform, coordinators, host institutions).
- `data/labs/<pi-slug>.yml`, `data/events/<YYYY-MM-DD>-<slug>.md`, `data/tutorials/<slug>.yml`, `data/positions/<slug>.md`, `data/news/<YYYY-MM-DD>-<slug>.md`: one file per entry.
- `docs/<slug>.md`: these documents.
- `public/photos/<pi-slug>.webp`: PI photos, 400 by 400 pixels.
- `src/`: the Astro site. `scripts/intake.mjs`: the parser the intake workflow runs.
- `.github/ISSUE_TEMPLATE/`: the forms. `.github/workflows/`: the automation.

Every data folder contains an `example-*` file marked `draft: true`. Drafts are validated at build time but never published, so they are safe to copy from. The workflows use only official GitHub actions plus the lychee link checker, never pass user text through a shell, and cannot merge anything.

## The intake pipeline

1. Someone fills in a form on the [Join page](../../join/) or under Issues. The forms are lab (title prefix `[Lab]`), event (`[Event]`), tutorial (`[Tutorial]`), position (`[Position]`) and speaker nomination (`[Speaker]`). Each opens an issue labelled `intake` plus a type label such as `intake:lab`.
2. The **Intake submissions** workflow runs when the issue is opened or edited. It parses the form, downloads and resizes the photo if there is one, writes the data file, and runs a validation build.
3. If the build passes, it pushes a branch `intake/issue-<n>` and opens a pull request that closes the issue on merge. If it fails, it comments on the issue with the error and adds the label `needs-changes`. The submitter edits the issue, the workflow re-runs, and the same pull request is updated.
4. A coordinator reviews the pull request and merges it. The **Deploy site** workflow then rebuilds and publishes the site.

Pull requests opened by the workflow do not trigger the **Build check** (GitHub does not run checks on bot-created pull requests). That is why the intake workflow runs the validation build itself before opening the pull request.

## Reviewing a lab submission

Open the pull request and read the file. Check that:

- It is a real lab led by a principal investigator at an institution in a Greater Bay Area city, or a genuine affiliate elsewhere with a stated connection to the region. A look at the institutional page or a recent paper is enough.
- The consent box was ticked in the issue.
- If a photo was given, it is a head-and-shoulders picture of the PI, not a logo, a group photo or a stock image. A photo is optional; the roster shows initials otherwise.
- Keywords are sensible and few. Five or six is plenty; trim a long list rather than reject.
- The description is plain. No marketing language, no rankings, no superlatives. Edit lightly if needed and say so in a comment.

If all of that holds, merge. When in doubt, ask a second coordinator on the pull request. If changes are needed, ask the submitter to edit the issue rather than rewriting the entry silently.

## Reviewing events, tutorials and positions

- Events: a member or affiliate lab is hosting, the date and time are in Hong Kong Time, and there is no meeting link in the file. Meeting links go out by email and the group chat only.
- Tutorials: the linked material exists, is openly accessible without a login, and is what the entry says it is. Open the link yourself.
- Positions: there is a real application deadline or an expiry date. The Monday build removes expired positions automatically; an entry without a date would sit there forever.

## Speaker nominations

Nominations stay as issues labelled `speaker-nomination`; nothing is published. Hosts and coordinators pick from the list when planning a seminar. Close the issue with a one-line note when the person has been invited or has declined. Issues are publicly readable, so keep comments discreet: no remarks about someone's availability, funding or personal circumstances.

## The weekly routine

Two workflows run every Monday morning. **Deploy site** runs at 00:00 UTC (08:00 Hong Kong Time) and rebuilds the site, which refreshes the split between upcoming and past events and drops expired positions. **Weekly digest** runs an hour later, at 09:00 Hong Kong Time, and runs the lychee link checker over the built site and opens, or updates, an issue labelled `weekly-digest` listing pending intake issues, open intake pull requests and broken links.

One coordinator reads the digest that day or the next. Merge what is ready, reply to what is stuck, and fix broken links by pull request.

### Optional assisted triage

A scheduled AI assistant session may help with this routine: it can triage new submissions, fix formatting, draft the next announcement text and poster, and post a summary in the digest. It never merges. Approval is a human act, and the review checklist above applies to anything it prepared.

### Monthly sweep

Once a month, look at anything in the digest older than 30 days and give it a decision: merge, ask for changes, or close with a short note explaining why.

## Recordings

Record only with the speaker's written consent, given before the talk (see [privacy and consent](../privacy-and-consent/)). Upload to both Bilibili and YouTube, then add both links to the event file by pull request. The host lab normally does this and a coordinator merges.

## Editing network.yml

Coordinators, host institutions, the contact email, the status banner and the seminar slot all live in `data/network.yml`. Change them by pull request like any other file; Build check validates it, so a typo shows up before it reaches the site. Remove the status banner by leaving the field empty.

## Adding or rotating a coordinator

1. Add the person to the `coordinators` list in `data/network.yml` and remove anyone stepping down.
2. Grant them write access to the repository. Keep at least two people with owner rights at all times.
3. Tell the group chat and the announcement list.

When the interim coordinator hands over, transfer the repository to a GitHub organisation so that the site address stops being a personal one. GitHub redirects the old address, and the Deploy site workflow needs no change.

## Backups and mainland access

Every clone of the repository is a complete backup of every file and its history, so each coordinator should keep a local clone and pull now and then. GitHub Pages is usually reachable from the mainland. If access degrades for a sustained period, a Gitee mirror is an option, not a requirement; raise it with the other coordinators first.

## When the build fails after a merge

Open the Actions tab and read the log of the failed Deploy site run. Validation errors name the file and the field. Fix it by pull request, or revert the merge if the fix is not obvious. The previous deployment stays live until a build succeeds, so a failed build is an inconvenience, not an outage. If the log shows something other than a validation error, ask the repository maintainer.
