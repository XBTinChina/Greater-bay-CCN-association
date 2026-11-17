---
title: Operations handbook
summary: How coordinators review submissions, update the website, send newsletters and resolve problems.
audience: coordinators
order: 60
---

This handbook is for coordinators who maintain the website. Lab, event, resource and position forms create public GitHub issues. Automation prepares a pull request for each valid submission; a coordinator reviews and merges it before it appears on the website. Speaker nominations stay as issues for discussion. See the [data model](../data-model/) for field definitions and [hosting a seminar](../hosting-a-seminar/) for the event checklist.

## The repository in brief

- `data/network.yml`: network-wide settings (name, mission, the status banner shown on internal pages, contact email, newsletter address, seminar arrangements, coordinators and host institutions).
- `data/labs/<pi-slug>.yml`, `data/events/<YYYY-MM-DD>-<slug>.md`, `data/tutorials/<slug>.yml`, `data/positions/<slug>.md`, `data/news/<YYYY-MM-DD>-<slug>.md`: one file per entry.
- `docs/<slug>.md`: these documents.
- `public/photos/`: PI and speaker photos. The lab intake workflow produces 400 by 400 pixel WebP images.
- `src/`: the Astro site. `scripts/intake.mjs`: the parser the intake workflow runs.
- `.github/ISSUE_TEMPLATE/`: the forms. `.github/workflows/`: the automation.

The labs, events, tutorials and positions folders include example entries marked `draft: true`. Drafts are checked at build time but are not published. Copy an example when adding an entry by hand. The intake workflow prepares changes for review; a coordinator decides whether to merge them.

## The intake pipeline

1. Someone fills in a form linked from the [Join page](../../join/) or opens one under Issues. The listing forms are lab (title prefix `[Lab]`), event (`[Event]`), tutorial (`[Tutorial]`) and position (`[Position]`). Speaker nominations use a separate `[Speaker]` form and do not create a listing pull request. They are GitHub issue templates, so they need a free GitHub account. Each listing form opens an issue labelled `intake` plus a type label such as `intake:lab`. Nominations use the label `speaker-nomination`.
2. The **Intake submissions** workflow runs when the issue is opened or edited. It parses the form, downloads and resizes the photo if there is one, writes the data file, and runs a validation build.
3. If the build passes, it pushes a branch `intake/issue-<n>` and opens a pull request that closes the issue on merge. If it fails, it comments on the issue with the error and adds the label `needs-changes`. The submitter edits the issue, the workflow re-runs, and the same pull request is updated. If a coordinator has edited the branch manually, the workflow stops to preserve those edits; describe further changes on the pull request instead.
4. A coordinator reviews the pull request and merges it. The **Deploy site** workflow then rebuilds and publishes the site.

Pull requests opened by the workflow do not trigger the **Build check** (GitHub does not run checks on bot-created pull requests). That is why the intake workflow runs the validation build itself before opening the pull request.

People without a GitHub account can ask a colleague or a coordinator listed on the [About page](../../about/) for help with a submission.

## Reviewing a lab submission

Open the pull request and read the file. Check that:

- The lab is led by a principal investigator at an institution in the Greater Bay Area, or is applying as an affiliate from elsewhere. Check the affiliation and the stated connection to the network using a lab or institutional page.
- The consent box was ticked in the issue.
- If someone submitted on the PI's behalf, confirm the PI's agreement before merging. The PI can confirm on the issue or contact a coordinator directly. Do not require a private email address to be posted in a public issue.
- If a photo was given, it is a head-and-shoulders picture of the PI, not a logo, a group photo or a stock image. A photo is optional; the roster shows initials otherwise.
- Keywords describe the research clearly. The form accepts up to eight; ask the submitter to shorten or clarify the list if needed.
- The description explains the research in plain terms. Remove unsupported promotional claims, while preserving the lab's scientific meaning. Explain proposed wording changes to the submitter.

If all of that holds, merge. When in doubt, ask a second coordinator on the pull request. If changes are needed, ask the submitter to edit the issue rather than rewriting the entry silently.

## Reviewing events, tutorials and positions

- Events: confirm the host, date, weekday and time with the organiser. The usual seminar slot is the second Friday, 16:00–17:00 Hong Kong Time, but an event may have a different confirmed date. The event page is the source for that event's arrangements. The submission form rejects direct meeting URLs and passcodes; use a public event-information or registration page instead. Keep private access details out of public issues and files. Hosts share any private joining details directly with participants.
- Tutorials: the linked material exists, is openly accessible without a login, and is what the entry says it is. Open the link yourself.
- Positions: confirm an application deadline or removal date. If `expires` is set, it controls removal; otherwise the deadline is used. A listing is removed at the next build after that date.

## Speaker nominations

Nominations remain public GitHub issues labelled `speaker-nomination`; they do not appear as website listings. Hosts and coordinators pick from the list when planning a seminar. A nomination is a suggestion, not a commitment to invite someone. Before acting on an older nomination, check with the nominator that it is still relevant. When the person is invited, add the event page link when available and close the issue. If they decline, close it with a brief note. Issues are public. Include only professional information relevant to the nomination, and keep private availability or personal circumstances out of the discussion.

## The weekly routine

Two workflows run every Monday morning. **Deploy site** runs at 00:00 UTC (08:00 Hong Kong Time) and rebuilds the site, which refreshes the split between upcoming and past events and drops expired positions. **Weekly digest** runs an hour later, at 09:00 Hong Kong Time, and runs the lychee link checker over the built site and opens, or updates, an issue labelled `weekly-digest` listing pending intake issues, open intake pull requests and broken links. Because event status is computed at build time, a completed talk may remain under upcoming until the next rebuild. Use the date of the next confirmed event when preparing announcements.

One coordinator reads the digest that day or the next. Merge what is ready, reply to what is stuck, and fix broken links by pull request.

One thing in that reading needs a coordinator rather than a reply: an accepted submission with no pull request behind it. That means the intake workflow stopped somewhere, so read its run in the Actions tab.

### Optional assisted triage

An assistant may help review submissions, fix formatting, and draft announcements or posters. Prepare event announcements in the two weeks before the confirmed event date. A coordinator must check and approve the result before publication; the same review checklist applies to human and automated drafts.

### Monthly sweep

Once a month, look at anything in the digest older than 30 days and give it a decision: merge, ask for changes, or close with a short note explaining why. After a seminar is a useful time to confirm the next host and review outstanding items.

## Recordings

Record only with the speaker's written consent, given before the talk (see [privacy and consent](../privacy-and-consent/)). Upload to both Bilibili and YouTube, then add both links to the event file by pull request. The host lab normally does this and a coordinator merges.

## Sending the newsletter

[GBA-CCN Network Updates](https://buttondown.com/gba-ccn) is the optional email newsletter. Its subscription address is set in `data/network.yml` as `mailing_list_url`; the site's Subscribe links use that address. Subscribers sign up through Buttondown, and subscriber lists and account credentials stay outside this public repository.

Use the [newsletter templates](../newsletter-templates/) for event announcements, weekly updates, monthly summaries and positions. Each includes the standard website and subscription links.

Check for newsletter items weekly. Send only when there is new or meaningfully changed information to share; otherwise skip the week. Combine routine items into one email. A useful monthly summary can replace that week's update. Use separate announcements for timely notices or important changes, and check sent issues in Buttondown to avoid duplicates.

Sending is manual. Publishing a website update or running the weekly digest workflow does not send a newsletter.

1. Sign in to the network's Buttondown account, choose a newsletter template and fill it with confirmed announcements and full public links. Remove all placeholders and empty sections; keep the shared footer and Buttondown's recipient-specific unsubscribe links.
2. Have a coordinator review the text, dates, links and intended audience, and preview the email. Link to public event or registration pages; send private meeting links directly to attendees.
3. Once the issue is ready, send it manually from Buttondown to subscribers. Do not enable automatic sending as part of a website update.

## Editing network.yml

Coordinators, host institutions, the contact email, the status banner and the seminar slot all live in `data/network.yml`. Change them by pull request like any other file; Build check validates it, so a typo shows up before it reaches the site. Remove the status banner by leaving the field empty.

The slot is two fields, not one. `seminar.slot` is the sentence the site prints. `seminar.proposed` decides whether that sentence is printed with "Proposed: ..., subject to confirmation by the member labs" in front of it on the home page, the events index and the About page. Set `proposed: false` once the coordinators have settled the slot, and correct the comment above the field at the same time, so the next coordinator can see the flag was decided rather than forgotten. One thing the flag does not reach: the slot sentences written out by hand in `README.md` and in the documents under `docs/`, which have to be edited in the same pull request. The "Proposed arrangements" note on the About page follows `seminar.proposed` too, so it clears itself.

## Adding or rotating a coordinator

1. Add the person to the `coordinators` list in `data/network.yml` and remove anyone stepping down.
2. Arrange the repository access needed for their role and confirm that another coordinator can maintain the site during a handover.
3. Tell the group chat and the announcement list.

The coordinators may transfer the repository to a GitHub organisation. After a transfer, check the Pages settings, deployment configuration, website address and public links. Verify a successful deployment before announcing the new address.

## Backups and mainland access

Keep an up-to-date full clone of the repository as a backup of its versioned files and history. Newsletter accounts and externally hosted recordings need separate arrangements. Access to GitHub services can vary by network. If participants report persistent problems, discuss an additional access route or mirror with the coordinators.

## When the build fails after a merge

Open the Actions tab and read the log of the failed Deploy site run. Validation errors name the file and the field. Fix it by pull request, or revert the merge if the fix is not obvious. The previous deployment stays live until a build succeeds, so a failed build is an inconvenience, not an outage. If the log shows something other than a validation error, ask the repository maintainer.
