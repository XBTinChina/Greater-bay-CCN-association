---
title: Newsletter templates
summary: Four concise newsletter formats with a shared masthead, clear action links and a consistent footer.
audience: coordinators
order: 55
---

Use these templates whenever preparing a GBA-CCN newsletter. This page is the shared reference for coordinators and assistants. The [filled weekly preview](https://github.com/XBTinChina/Greater-bay-CCN-association/blob/newsletter-design-draft/templates/newsletter/preview.html) illustrates the proposed layout; it is a review draft, not a sent issue.

## Design

Use a compact masthead and issue date, one clear lead item, short labelled sections and a consistent footer. Link the headlines and highlight the facts that help readers decide whether to follow them. Use a short inbox preview sentence when the sending editor supports it. Recurring digests start with the news; a greeting and sign-off are optional for personal messages such as a welcome.

For the visual version, use the website's lavender and violet identity with a white reading area, dark text, a small existing logo and a single column about 640 pixels wide. Body text should be at least 16 pixels, with comfortable line spacing. Colour supports the structure; all essential information must remain readable as text with images blocked. Avoid large decorative banners and sidebars. The HTML preview demonstrates the layout; its rendering has not been tested in every email client.

Use as few words as possible without losing the facts needed to decide whether to click. Make titles clickable; bold dates, deadlines and other deciding facts. Prefer one descriptive link per item over a second “Read more” link to the same page. Add a separate registration or application link only when it serves a different action.

Keep each item to a linked title, essential facts and at most one short sentence. Usually 20–40 words for the lead and 10–25 for another item are enough, excluding names and required conditions; these are ceilings to aim below, not quotas. A three-item weekly email can fit in roughly 100–180 words including the footer. Keep dates, time zones, deadlines and relevant restrictions in the email; put full abstracts, biographies, job descriptions and application instructions behind the links. Remove greetings, sign-offs, repeated introductions, redundant summaries and empty sections.

## When to send

- Check weekly. Send only when there is something new or meaningfully changed to share; otherwise skip the week.
- Combine routine items into one email. A monthly summary is optional and replaces that week's update.
- Send a separate event or position announcement when waiting would make it less useful. Use attendee or group channels for routine event reminders.
- Check the sent issues in Buttondown to avoid duplicates. Repeat an item only for a useful update or approaching deadline, and say what has changed.
- These templates do not schedule or send emails. The repository's Weekly digest is an internal maintenance report.

## How to use

1. Choose a template. Put its subject in Buttondown's subject field, without the `Subject:` label. If a preview-text field is available, put the `Preview text:` line there. Neither label belongs in the body. If there is no preview-text field, omit that line.
2. Copy the remaining Markdown body without its code fences. Use Markdown mode or apply the headings and links in the rich-text editor. The visual preview is a design reference, not a change to Buttondown's account-wide theme.
3. Replace every `{placeholder}`; remove unused instructions, fields and sections. Use concise English, with names or titles in other scripts alongside it where helpful.
4. Use the published event page or recruiting institution's advert as the source. Include the year in dates, the time zone beside event times and timed deadlines, and an end time only when confirmed. Do not invent a closing time for a date-only deadline. If the employer explicitly says “Open until filled”, use that wording instead of “Apply by”.
5. Match each linked title or action label to its destination. Link event titles to public event pages and use “Register” only for a registration page. For a lead that is not an event, change both the title and its URL. Position links go to the employer's advert or the network's positions list; the website has no individual position pages.
6. Keep the masthead and common footer. Have a coordinator review the facts, audience, links and preview before sending. A request for a draft does not authorise sending it.

## The shared footer

The same footer appears in every template: a contribution invitation, stable website links, contact and signup routes, and a short explanation of why the reader receives it. The worldwide welcome belongs in the masthead.

Buttondown adds recipient-specific unsubscribe and subscription-management links. Preserve that automatic footer; never paste a recipient's personal link into a reusable template. The HTML preview shows where those controls belong, without creating fake unsubscribe links. General contact uses the coordinator page rather than assuming replies are monitored.

Keep private meeting links, passcodes, subscriber details and private correspondence out of newsletters and this public repository. Use public event or registration pages; send private access details through the appropriate attendee channel. Share recordings and slides only with permission.

## 1. Event announcement

Use for a confirmed seminar, workshop or other event. Put the date, time, place and action near the title. Include attendance restrictions or registration requirements only as confirmed; omit unneeded fields.

```markdown
Subject: GBA-CCN | {Short event title} | {Day Month Year}
Preview text: {Speaker} · {Time and time zone} · {Online or city}

# GBA-CCN Network Updates

**Event · {Issue date}**  
*Greater Bay Area · Open worldwide*

## [{Short event title}]({Full public event-page URL})

**{Weekday, day month year} · {Time and time zone}** · {Online platform or venue}

**{Speaker}** · {Institution}  
{One short sentence on the topic; omit if the title says enough.}

{If registration is required: **[Register by {confirmed deadline}]({Public registration URL})**.}
{If needed: {Confirmed eligibility, capacity or fee information}.}

---
**[Share an event, opening or resource](https://xbtinchina.github.io/Greater-bay-CCN-association/join/)**

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/) · [Contact](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

Greater Bay Area Computational and Cognitive Neuroscience Network  
You received this because you subscribed. Unsubscribe or manage preferences below.
```

## 2. Weekly update

The default. One useful item is enough. Use linked headlines and essential facts; omit an “In this issue” line in a short email. An approaching deadline or important change can lead instead of an event. Remove unused sections or metadata that does not apply.

```markdown
Subject: GBA-CCN | {Lead topic} + {Other main item}
Preview text: {Next event date or deadline and one useful detail}

# GBA-CCN Network Updates

**Weekly · {Day Month Year}**  
*Greater Bay Area · Open worldwide*

## [{Lead item: specific title}]({Full public details URL})

**{Essential date, time and time zone}** · {Location or format}  
{Speaker or organiser}. {Optional short sentence on the topic.}

## Opportunities

**[{Role or research area}]({Full employer advert URL or network positions URL})**  
{Lab or institution} · {City}  
**Apply by {confirmed deadline}.** {Optional: one essential detail.}

## Around the network

**[{New lab, resource or update}]({Full public URL})**  
{One short sentence saying what is new; omit if the title says enough.}

---
**[Share an event, opening or resource](https://xbtinchina.github.io/Greater-bay-CCN-association/join/)**

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/) · [Contact](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

Greater Bay Area Computational and Cognitive Neuroscience Network  
You received this because you subscribed. Unsubscribe or manage preferences below.
```

## 3. Monthly summary

Optional; replaces that week's update. Use a few linked highlights, then upcoming events and deadlines. Delete empty sections and unchanged repeats.

```markdown
Subject: GBA-CCN | {Month Year} | {Lead highlight}
Preview text: {Main highlight} · {Next event or deadline}

# GBA-CCN Network Updates

**Monthly · {Month Year}**  
*Greater Bay Area · Open worldwide*

## Highlights

**[{Outcome or resource}]({Full public URL})**  
{One short sentence on what is new or available.}

## Coming up

**[{Event title}]({Full public event-page URL})**  
**{Day month year, time and time zone}** · {Location or format}  
{Speaker or organiser}.

## Opportunities

**[{Role}]({Full employer advert URL or network positions URL})**  
{Lab or institution} · {City}  
**Apply by {confirmed deadline}.**

---
**[Share an event, opening or resource](https://xbtinchina.github.io/Greater-bay-CCN-association/join/)**

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/) · [Contact](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

Greater Bay Area Computational and Cognitive Neuroscience Network  
You received this because you subscribed. Unsubscribe or manage preferences below.
```

## 4. Position announcement

Usually include openings in the weekly update. For a separate announcement, retain the role, institution, location, deadline and essential eligibility. Link the title to the full advert. Add funding or duration only when useful and confirmed.

```markdown
Subject: GBA-CCN | {Role} at {Institution}
Preview text: {Research area} · {City} · {Confirmed deadline}

# GBA-CCN Network Updates

**Position · {Issue date}**  
*Greater Bay Area · Open worldwide*

## [{Role or research area}]({Full employer advert URL or network positions URL})

**{Lab or institution} · {City}**  
**Apply by {confirmed deadline}**

{One short sentence on the work.}

**Required:** {Essential qualification or eligibility only}.
{If useful: **Start / duration / funding:** {Confirmed details}.}

---
**[Share an event, opening or resource](https://xbtinchina.github.io/Greater-bay-CCN-association/join/)**

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/) · [Contact](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

Greater Bay Area Computational and Cognitive Neuroscience Network  
You received this because you subscribed. Unsubscribe or manage preferences below.
```

## Before sending

Check for unfilled placeholders and empty sections; verify current dates, eligibility and deadlines; open the links; preview at a narrow width; and confirm the intended audience and automatic unsubscribe footer. After sending, use Buttondown's sent record as the history. Keep subscriber addresses and delivery reports out of the repository.

## Examples used to inform this revision

These are layout references, not sources for GBA-CCN announcements. Our wording and artwork are our own.

- [SNL, September 2025](https://www.neurolang.org/newsletters/SNL_September_2025.pdf): dated masthead, society news before grouped opportunities, clear submission route.
- [CNS newsletter](https://www.cogneurosociety.org/newsletter/): stable society, meeting and recruitment sections. Borrow the hierarchy while keeping our listings shorter.
- [SfN Nexus, issue displayed as 1 November 2024](https://www.sfn.org/publications/nexus-member-newsletter): linked headlines with short descriptions and concrete actions.
- [OHBMonthly, May 2024](https://humanbrainmapping.org/i4a/email/browserEmailMessage.cfm?bTest=1&campaignID=4085&contactID=%25%25contactID%25%25&recipID=%25%25recipID%25%25): contents and deadlines, short job summaries and an invitation to contribute.
