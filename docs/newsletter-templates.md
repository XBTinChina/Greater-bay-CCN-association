---
title: Newsletter templates
summary: Copy-ready event, weekly update, monthly summary and position emails, with shared website and subscription links.
audience: coordinators
order: 55
---

Use these templates whenever preparing a GBA-CCN newsletter. This page is the shared reference for coordinators and assistants. Keep the templates here up to date rather than maintaining separate copies in different tools.

## When to send

- **Check weekly; send only when there is something useful to share.** New events, openings, resources, network news, important changes and approaching deadlines can qualify. If there is nothing new or meaningfully changed, skip the week.
- **Combine routine items into one weekly email.** A monthly summary is optional and replaces that week's update.
- **Use a separate event or position email when waiting would make the notice less useful.** Use attendee or group channels for routine event reminders. Send a correction, cancellation or important change promptly when subscribers need it.
- **Avoid duplicates.** Check the sent issues in Buttondown before drafting. Mention an already announced item again only when there is a useful update or reminder, and say what is new.
- These are reusable templates, not a scheduled sending service. The repository's **Weekly digest** is a separate internal maintenance report and does not email subscribers.

## How to use

1. Choose a template below. Copy its subject into Buttondown's subject field, without the `Subject:` label, and copy the remaining block into the email body. Do not copy the surrounding code fences.
2. Replace every `{placeholder}`. Remove unused fields, optional instructions and empty sections. Use concise English; names and titles in other scripts can appear alongside it. Write for students, research staff, postdocs, faculty and other interested readers.
3. Use the published event page or employer's advert as the source. Include a full date with year; put the time zone beside event times and timed deadlines. Do not assume an event uses the network's usual seminar slot.
4. Keep the shared footer already included in each template. The blocks use Markdown; use the editor's Markdown mode or format the headings and links in its rich-text editor, then check the preview.
5. Have a coordinator review the facts, links, audience and preview before sending. Publishing a template or a website update does not authorise or trigger a newsletter send.

## What every email includes

Each template has a clear subject, a short message, a relevant action link and the same network footer. The footer links to the website, events, positions, resources, contribution routes, coordinators and newsletter signup.

Buttondown adds the recipient-specific unsubscribe and subscription-management links below the message. Keep that automatic footer enabled. Never copy a recipient's personalised unsubscribe URL into a template or replace it with a generic link. The templates do not rely on a monitored reply address; use the coordinator page for general contact.

Keep private meeting links, passcodes, subscriber details and private correspondence out of newsletters and this public repository. Link to public event or registration pages, and share private access details through the appropriate attendee channel. Share recordings and slides only when permission to publish has been confirmed.

If the network name or website changes, update all four copies of the common footer together. There are no individual position pages on this website: link to the employer's advert/application page, or the [positions list](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) when appropriate.

## 1. Event announcement

Use for a seminar, workshop or other confirmed event. Normally include the announcement in the weekly update; use a separate email when it needs timely notice. Delete speaker or host fields that do not apply. Do not imply attendance is unrestricted if registration, eligibility or capacity limits apply.

```markdown
Subject: GBA-CCN | {Event title} | {Day Month Year}

Dear colleagues,

You are invited to {event title}.

{One or two plain sentences about the topic and who may find it useful.}

- **Speaker:** {Name, institution}
- **When:** {Weekday, day month year}, {start–end time} Hong Kong Time (UTC+8)
- **Where:** {Online platform, or venue and city}
- **Host:** {Lab or institution}
- **Attendance:** {Registration requirements, any restrictions and confirmed fee or free admission}

[Event details and registration]({Full public event-page URL})

{Optional: Register by {date, time and time zone}.}

Best wishes,
GBA-CCN Network

---
**GBA-CCN Network**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Open positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)

[Contribute or list your lab](https://xbtinchina.github.io/Greater-bay-CCN-association/join/) · [Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/)

Forwarded this email? [Subscribe to the newsletter](https://buttondown.com/gba-ccn). You can unsubscribe or manage your subscription using the links below.
```

## 2. Weekly update

This is the default newsletter. Cover new or meaningfully changed items since the last sent issue, even if a quiet week was skipped. Remove empty sections. Repeat item blocks only as needed; aim for three to five useful items rather than filling every category.

```markdown
Subject: GBA-CCN | Weekly update | {Day Month Year}

Dear colleagues,

Here are the latest updates from the network: {one short sentence naming the main items}.

## Upcoming events

**{Event title}** — {Day month year, time and time zone}  
{Speaker or organiser, institution}. {One sentence about the topic or what has changed.}  
[Details and registration]({Full public event-page URL})

## New positions

**{Role} — {Lab or institution}, {City}**  
{One sentence about the research area or role.}  
Deadline: {Confirmed date, time and time zone, or employer-confirmed "Open until filled"}.  
[Details and how to apply]({Full employer or application URL})

## Resources and network news

**{Resource or news title}**  
{One sentence about what is new and why it may be useful.}  
[Read more]({Full public URL})

Best wishes,
GBA-CCN Network

---
**GBA-CCN Network**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Open positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)

[Contribute or list your lab](https://xbtinchina.github.io/Greater-bay-CCN-association/join/) · [Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/)

Forwarded this email? [Subscribe to the newsletter](https://buttondown.com/gba-ccn). You can unsubscribe or manage your subscription using the links below.
```

## 3. Monthly summary

Use when a monthly overview is useful. It replaces that week's update, rather than repeating it in a second email. Include new outcomes, materials or next steps; do not resend the month's weekly updates unchanged. Skip it if there is nothing useful to add. Remove empty sections.

```markdown
Subject: GBA-CCN | Monthly summary | {Month Year}

Dear colleagues,

Here is a brief look at {month}'s activities and what is coming next.

## This month's highlights

**{Activity or development}**  
{One or two sentences about the outcome or what is now available.}  
[Read more]({Full public URL})

## Recordings and resources

**{Title}** — {Speaker or author}  
{One sentence about the material and its language.}  
[View the resource]({Full public event or resource URL})

## Coming up

**{Event title}** — {Day month year, time and time zone}  
{Speaker or organiser, institution}. {One sentence about the topic.}  
[Details and registration]({Full public event-page URL})

## Open positions

**{Role} — {Lab or institution}, {City}**  
{One sentence about the role or an approaching deadline.}  
Deadline: {Confirmed date, time and time zone, or employer-confirmed "Open until filled"}.  
[Details and how to apply]({Full employer or application URL})

Best wishes,
GBA-CCN Network

---
**GBA-CCN Network**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Open positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)

[Contribute or list your lab](https://xbtinchina.github.io/Greater-bay-CCN-association/join/) · [Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/)

Forwarded this email? [Subscribe to the newsletter](https://buttondown.com/gba-ccn). You can unsubscribe or manage your subscription using the links below.
```

## 4. Position announcement

Usually include openings in the weekly update. Use a separate announcement when timely notice is needed, or combine several new roles in one email. Use the employer's current advert for eligibility, funding, salary and deadlines. Do not infer that a position is funded or open until filled. Delete optional fields if unconfirmed.

```markdown
Subject: GBA-CCN | {Role} at {Institution} | {City}

Dear colleagues,

{Lab or institution} is recruiting a {role} in {research area}.

{One or two sentences describing the work and the kind of experience sought.}

- **Institution and lab:** {Institution; lab or PI}
- **Location:** {City; on-site, hybrid or remote if confirmed}
- **Role:** {Position type; full-time or part-time if confirmed}
- **Eligibility:** {Key requirements from the employer's advert}
- **Deadline:** {Confirmed date, time and time zone, or employer-confirmed "Open until filled"}
- **Start date and duration:** {Optional: confirmed details}
- **Funding or salary:** {Optional: confirmed details}

[Full advert and how to apply]({Full employer or application URL})

Questions about the role: {Public recruitment contact from the employer's advert}.

Please follow the employer's application instructions. Applications are handled by the recruiting institution.

Best wishes,
GBA-CCN Network

---
**GBA-CCN Network**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Open positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)

[Contribute or list your lab](https://xbtinchina.github.io/Greater-bay-CCN-association/join/) · [Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/)

Forwarded this email? [Subscribe to the newsletter](https://buttondown.com/gba-ccn). You can unsubscribe or manage your subscription using the links below.
```

## Before sending

- No placeholders, optional instructions or empty sections remain.
- Names, dates, time zones, deadlines and links match the current source; expired openings and past events are not presented as upcoming.
- A poster supplements the written event details rather than replacing them.
- The rendered preview is readable on a narrow screen, links work, and Buttondown's unsubscribe footer is present.
- The intended active subscribers are selected, and the issue does not repeat a recent send without a useful change.

After sending, use the issue's Buttondown record as the sending history. Do not copy subscriber addresses or delivery reports into the public repository.
