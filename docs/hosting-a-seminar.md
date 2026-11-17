---
title: Hosting a seminar
summary: A checklist for host labs, from inviting a speaker to sharing approved recordings and materials.
audience: coordinators
order: 40
---

Member labs take turns hosting the seminar series. The host invites the speaker, prepares the event page and announcement, chairs the session and shares any materials the speaker has agreed to publish.

The usual slot is the second Friday of the month at 16:00 Hong Kong Time (UTC+8), on Zoom with Tencent Meeting (VooV) as a fallback. The usual format is a 45-minute talk followed by 15 minutes of questions. An optional 15-minute early-career talk by a student or postdoc can open the session, extending it to 17:15. Individual events may use a different date or time; confirm the details with the speaker and coordinators and keep the event page current.

## Rotation and date changes

- Coordinators maintain the host rotation and publish it at least six months ahead. Check your assigned slot early.
- If your lab cannot host on that date, arrange a swap or discuss a later turn with the coordinators. Confirm changes before offering a date to a speaker.
- Name one person in the host lab as the main contact for the speaker and coordinators.

## About four months before: invite the speaker

- Check the nomination queue: GitHub issues labelled `speaker-nomination`. You may also suggest a speaker directly.
- Use the [invitation letter template](../invitation-letter-template/). Offer the agreed slot; discuss any alternative date with the coordinators and affected host lab first.
- Confirm the date, time, format and whether an early-career talk will open the session.
- Send the [speaker kit](../speaker-kit/) after the speaker accepts.

## About four weeks before: prepare the event page

- Collect the title, abstract, short biography and any photo the speaker wishes to provide.
- Ask for written recording consent; an email is enough. Do not record without consent.
- Create the event through the Event issue form, or add `data/events/<YYYY-MM-DD>-<slug>.md` by pull request. The [data model](../data-model/) explains the fields.
- In forms, use a public event or registration page URL. Forms do not accept direct meeting URLs or passcodes. Keep private access details out of public submissions.
- After the change is merged, check the [event page](../../events/) and the poster at `/events/<id>/poster/`.
- Run the **Render poster** workflow with the event ID to create a PNG for announcements.

## About two weeks before: announce

- Share the poster and announcement through group chats and departmental lists, and include it in the next newsletter. Use the [newsletter templates](../newsletter-templates/) for email, or the short announcement in the [invitation letter template](../invitation-letter-template/) for other channels. Send a separate newsletter when timely notice is needed.
- Check that the public event page shows the confirmed date, time, speaker and host. It updates when the site rebuilds after a merged change.
- Share any private access details directly with attendees. Do not include them in public posts or publicly visible newsletter archives.

## About one week before: rehearse

- Remind attendees through the appropriate group or attendee channels. Send another newsletter only for a useful update, such as a changed time or approaching registration deadline.
- Arrange a short test with the speaker if needed, including screen sharing and audio.
- Prepare the Tencent Meeting fallback and keep its link ready.
- Confirm the chair and a person to monitor the chat and questions.
- Confirm the early-career talk, if there is one.

## On the day

- Open the room ten minutes early and check the speaker's audio and screen sharing.
- If recording was agreed, announce it before recording begins.
- Briefly introduce the network, speaker and session format.
- Keep to the agreed timings. Give the main speaker a reminder at about 40 minutes and keep any opening talk to 15 minutes.
- Take questions from raised hands and the chat. Questions may be in English, Cantonese or Mandarin; the chair helps summarise in English when needed.
- Thank the speaker and announce the next confirmed seminar date and host, if available. Check the event listing rather than assuming it follows the usual slot.

## Within one week after: follow up

- If recording was agreed, trim the start and end and upload it to Bilibili and YouTube.
- Add the recording links and any slides approved for publication to the event file by pull request.
- Send the speaker a thank-you note and the published links.
- If the nomination issue is still open, close it with a link to the event page.

## If plans change

- **Speaker absent:** contact the speaker at the agreed start time. An opening talk may go ahead as planned. If the speaker has not arrived after 20 minutes, or after ten minutes when there is no opening talk, tell attendees that the session is postponed. Inform the coordinators within a week and agree a replacement date with them.
- **Platform failure:** switch to the prepared fallback and share the new link through the appropriate attendee channels. Record only if consent was given.
- **Disruption:** follow the [code of conduct](../code-of-conduct/). The host may mute a participant, remove them if disruption continues and report the incident to a coordinator.
