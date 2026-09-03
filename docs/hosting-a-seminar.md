---
title: Hosting a seminar
summary: A timeline checklist for the member lab hosting a GBA-CCN Network seminar, from picking the speaker eight weeks out to posting the recording a week after.
audience: coordinators
order: 40
---

Every seminar is hosted by one member lab. The host picks the speaker, invites them, creates the event, announces it, chairs the session and posts the recording. This page is the checklist. Seminars run on alternate Thursdays at 16:00 Hong Kong Time, 45 minutes of talk plus 15 minutes of questions, on Zoom with Tencent Meeting (VooV) as the fallback. An optional 15-minute junior talk can go before the main talk, in which case the session runs 16:00 to 17:15.

## Rotation and swapping

- Coordinators keep the roster of upcoming hosts. Check it at least two months ahead so you know your date.
- If your date does not work, swap with another lab yourself and tell the coordinators the new order. Do not leave a slot empty without telling anyone.
- One person in your lab owns the seminar end to end. Name them to the coordinators.

## T-8 weeks: pick and invite the speaker

- Look at the nomination queue first: open GitHub issues labelled `speaker-nomination` in the repository. You may also propose your own speaker.
- Invite them with the [invitation letter template](../invitation-letter-template/). Offer your Thursday and, if possible, one alternative Thursday.
- Agree the date, the format (45 + 15) and whether a junior speaker goes first.
- Send the [speaker kit](../speaker-kit/) once they accept.

## T-4 weeks: materials and the event page

- Collect the title, abstract, a short bio and a photo.
- Collect written recording consent (an email is enough). No consent, no recording.
- Create the event in one of two ways:
  - Submit the Event issue form (template `event.yml`, title prefix `[Event]`). The intake workflow turns it into a pull request.
  - Or add `data/events/<YYYY-MM-DD>-<slug>.md` directly by pull request. The fields are documented in the [data model](../data-model/).
- Do not put the meeting link in the event file. It never goes on the site.
- Once merged, check the page under [events](../../events/) and the poster at `/events/<id>/poster/`.
- Run the "Render poster" GitHub Actions workflow (manual, input: the event id) to get the 1080x1350 PNG for WeChat and mailing lists.

## T-2 weeks: announce

- Post the poster and the announcement text (template in the invitation letter document) in the WeChat group and your departmental lists. Ask the other member labs to forward it.
- The calendar feed at `/calendar.ics` updates itself when the event is merged and the site rebuilds (on merge and every Monday). Nothing to do there.
- Send the meeting link to the announcement list and the WeChat group only.

## T-1 week: rehearse

- Send a reminder with the poster and the link.
- If the speaker is new to Zoom, do a ten-minute test call: screen sharing, audio, slides in presenter mode.
- Set up the Tencent Meeting fallback and keep its link ready.
- Assign a chair and a separate Q&A monitor. The monitor watches the chat and collects questions.
- Confirm with the junior speaker, if there is one.

## The day

- Open the room 10 minutes early. Let the speaker in first and check their audio and screen.
- Start recording at 16:00 if consent was given. Say aloud that the session is being recorded.
- Introduce the network in one sentence. Introduce the speaker in three.
- Keep time. Warn the speaker at 40 minutes. Stop the junior talk at 15.
- Collect questions from the chat and from raised hands. Questions may be asked in Cantonese, Mandarin or English; the chair summarises in English if the speaker does not follow.
- Thank the speaker and tell the audience the date of the next seminar.

## T+1 week: wrap up

- Upload the recording to both Bilibili and YouTube. Trim the start and the end.
- Add `recording.bilibili`, `recording.youtube` and `slides_url` to the event file by pull request.
- Send the speaker a thank-you note with the links.
- Close the nomination issue with a comment linking the event page.

## If things go wrong

- Speaker no-show. Message and call them at 16:00. At 16:10, run the junior talk if there is one, or tell the audience the session is postponed and post a new date within a week.
- Platform failure. Switch to the Tencent Meeting fallback and post the new link in the chat, the WeChat group and the announcement list. Keep the recording going on the new platform.
- Disruption. Follow the [code of conduct](../code-of-conduct/): mute the person, remove them from the meeting if it continues, and report the incident to a coordinator or the contact address on the [About](../../about/) page.
