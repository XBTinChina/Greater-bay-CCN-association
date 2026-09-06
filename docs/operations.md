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

1. Someone fills in a form on the [Join page](../../join/) or under Issues. The forms are lab (title prefix `[Lab]`), event (`[Event]`), tutorial (`[Tutorial]`), position (`[Position]`) and speaker nomination (`[Speaker]`). Each opens an issue labelled `intake` plus a type label such as `intake:lab`. There are two front doors to the same forms: the GitHub issue templates, which need a free account, and, when a coordinator has set `submit_url` in `data/network.yml`, the web forms under `/forms/` on the site, which need no account at all. A web-form submission is posted to a small endpoint that opens the identical issue, so from step 2 onwards the machinery is the same. The one thing that differs is who owns the issue, which matters only when a submission needs fixing; see below. Deploying and running that endpoint is described in [web forms](../web-forms/).
2. The **Intake submissions** workflow runs when the issue is opened or edited. It parses the form, downloads and resizes the photo if there is one, writes the data file, and runs a validation build.
3. If the build passes, it pushes a branch `intake/issue-<n>` and opens a pull request that closes the issue on merge. If it fails, it comments on the issue with the error and adds the label `needs-changes`. A submitter with a GitHub account edits the issue, the workflow re-runs, and the same pull request is updated. A submission that came through a web form has no author who can do that; the next section says who fixes it instead.
4. A coordinator reviews the pull request and merges it. The **Deploy site** workflow then rebuilds and publishes the site.

Pull requests opened by the workflow do not trigger the **Build check** (GitHub does not run checks on bot-created pull requests). That is why the intake workflow runs the validation build itself before opening the pull request.

Review is identical whichever door a submission came through. The pull request looks the same, the checks below are the same, and a web-form submission carries no more authority than a GitHub one. If you doubt a submission, ask, exactly as you would with any other.

Repair is not identical, and this is a standing task for coordinators. A web-form submission opens its issue under the network's GitHub App, so the issue's author is a name ending in `[bot]`, and a comment on the issue says it arrived through the web form. The person who filled the form in has no account: nobody notifies them, they cannot edit the issue, and they cannot reply to the workflow's comment. So when an App-authored issue is labelled `needs-changes`, that label is addressed to you, not to a submitter. Read the failure comment, then do one of two things:

- fix the issue body yourself, using the edit pencil on the first comment. Every edit re-runs the intake workflow and updates the same pull request, so a corrected issue heals itself.
- or, if the fix needs something only the submitter knows, write to the address in the submission's own contact field and ask for it. The form told them to keep their issue link and to check it in a day or two, but that is the only thread they have.

The endpoint refuses most of these at the door: it runs the same per-field and cross-field checks as the intake workflow, so the common mistakes come back to the submitter in the browser while they can still act on them. What is left, a validation build that fails for a reason no field check can see, or a rule only the workflow can apply, arrives as one of these App-authored issues. There should be few, and each one waits for a person.

## Reviewing a lab submission

Open the pull request and read the file. Check that:

- It is a real lab led by a principal investigator at an institution in a Greater Bay Area city, or a genuine affiliate elsewhere with a stated connection to the region. A look at the institutional page or a recent paper is enough.
- The consent box was ticked in the issue.
- If a photo was given, it is a head-and-shoulders picture of the PI, not a logo, a group photo or a stock image. A photo is optional; the roster shows initials otherwise.
- Keywords are sensible and few. Five or six is plenty; trim a long list rather than reject.
- The description is plain. No marketing language, no rankings, no superlatives. Edit lightly if needed and say so in a comment.

If all of that holds, merge. When in doubt, ask a second coordinator on the pull request. If changes are needed, ask the submitter to edit the issue rather than rewriting the entry silently. When the issue was opened by the App on behalf of a web-form submitter there is nobody to ask: edit the issue yourself and say in the pull request what you changed, or write to the contact address in the submission.

## Reviewing events, tutorials and positions

- Events: a member or affiliate lab is hosting, the date and time are in Hong Kong Time, and there is no meeting link in the file. Meeting links go out by email and the group chat only.
- Tutorials: the linked material exists, is openly accessible without a login, and is what the entry says it is. Open the link yourself.
- Positions: there is a real application deadline or an expiry date. The Monday build removes expired positions automatically; an entry without a date would sit there forever.

## Speaker nominations

Nominations stay as issues labelled `speaker-nomination`; nothing is published. Hosts and coordinators pick from the list when planning a seminar. Close the issue with a one-line note when the person has been invited or has declined. Issues are publicly readable, so keep comments discreet: no remarks about someone's availability, funding or personal circumstances.

## The weekly routine

Two workflows run every Monday morning. **Deploy site** runs at 00:00 UTC (08:00 Hong Kong Time) and rebuilds the site, which refreshes the split between upcoming and past events and drops expired positions. **Weekly digest** runs an hour later, at 09:00 Hong Kong Time, and runs the lychee link checker over the built site and opens, or updates, an issue labelled `weekly-digest` listing pending intake issues, open intake pull requests and broken links.

One coordinator reads the digest that day or the next. Merge what is ready, reply to what is stuck, and fix broken links by pull request.

Two things in that reading need a coordinator rather than a reply. Look for intake issues labelled `needs-changes` whose author ends in `[bot]`: those came through the web forms and their submitters cannot edit them, so each one waits for you to correct the issue body or to write to the contact address in it. An issue like that never resolves itself. And look for accepted submissions with no pull request behind them, which is the same situation seen from the other end.

### Optional assisted triage

A scheduled AI assistant session may help with this routine: it can triage new submissions, fix formatting, draft the next announcement text and poster, and post a summary in the digest. It never merges. Approval is a human act, and the review checklist above applies to anything it prepared.

### Monthly sweep

Once a month, look at anything in the digest older than 30 days and give it a decision: merge, ask for changes, or close with a short note explaining why.

## Recordings

Record only with the speaker's written consent, given before the talk (see [privacy and consent](../privacy-and-consent/)). Upload to both Bilibili and YouTube, then add both links to the event file by pull request. The host lab normally does this and a coordinator merges.

## Editing network.yml

Coordinators, host institutions, the contact email, the status banner, the seminar slot and the web-form endpoint (`submit_url`) all live in `data/network.yml`. Change them by pull request like any other file; Build check validates it, so a typo shows up before it reaches the site. Remove the status banner by leaving the field empty; the same goes for `submit_url`, which stops the site offering the web forms when it is empty. That is a change to the site, not to the endpoint: the endpoint keeps accepting posts from anyone who already has its address until you close it, which [web forms](../web-forms/) explains how to do.

## Adding or rotating a coordinator

1. Add the person to the `coordinators` list in `data/network.yml` and remove anyone stepping down.
2. Grant them write access to the repository. Keep at least two people with owner rights at all times.
3. Tell the group chat and the announcement list.

When the interim coordinator hands over, transfer the repository to a GitHub organisation so that the site address stops being a personal one. GitHub redirects the old address, and the Deploy site workflow needs no change.

## Backups and mainland access

Every clone of the repository is a complete backup of every file and its history, so each coordinator should keep a local clone and pull now and then. GitHub Pages is usually reachable from the mainland. If access degrades for a sustained period, a Gitee mirror is an option, not a requirement; raise it with the other coordinators first.

## When the build fails after a merge

Open the Actions tab and read the log of the failed Deploy site run. Validation errors name the file and the field. Fix it by pull request, or revert the merge if the fix is not obvious. The previous deployment stays live until a build succeeds, so a failed build is an inconvenience, not an outage. If the log shows something other than a validation error, ask the repository maintainer.
