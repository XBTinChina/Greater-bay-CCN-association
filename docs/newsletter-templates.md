---
title: Newsletter templates
summary: Four concise newsletter formats with a shared masthead, clear action links and a consistent footer.
audience: coordinators
order: 55
---

Use these templates whenever preparing a GBA-CCN newsletter. This page is the shared reference for coordinators and assistants. The [filled weekly preview](https://github.com/XBTinChina/Greater-bay-CCN-association/blob/newsletter-design-draft/templates/newsletter/preview.html) illustrates the proposed layout; it is a review draft, not a sent issue.

## Design

Use a recognisable masthead and issue date, one clear lead item, short labelled sections and a consistent footer. Put useful facts beside the relevant headline and give each item a descriptive action link. Use a short inbox preview sentence when the sending editor supports it. Recurring digests start with the news; a greeting and sign-off are optional for personal messages such as a welcome.

For the visual version, use the website's lavender and violet identity with a white reading area, dark text, a small existing logo and a single column about 640 pixels wide. Body text should be at least 16 pixels, with comfortable line spacing. Colour supports the structure; all essential information must remain readable as text with images blocked. Avoid large decorative banners and sidebars. The HTML preview demonstrates the layout; its rendering has not been tested in every email client.

Keep the lead to roughly 50–90 words and secondary items to roughly 25–50 words. These are editing guides, not quotas. A weekly issue will usually need only 200–350 words including the footer. Remove empty sections; one useful announcement is enough.

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
5. Match each action label to its destination. Use “View event details” for an event page and “Register” only for a registration page. For a lead that is not an event, change both the label and its URL. Position links go to the employer's advert or the network's positions list; the website has no individual position pages.
6. Keep the masthead and common footer. Have a coordinator review the facts, audience, links and preview before sending. A request for a draft does not authorise sending it.

## The shared footer

The same footer appears in every template: a contribution invitation, stable website links, contact and signup routes, and a short explanation of why the reader receives it. The worldwide welcome belongs in the masthead.

Buttondown adds recipient-specific unsubscribe and subscription-management links. Preserve that automatic footer; never paste a recipient's personal link into a reusable template. The HTML preview shows where those controls belong, without creating fake unsubscribe links. General contact uses the coordinator page rather than assuming replies are monitored.

Keep private meeting links, passcodes, subscriber details and private correspondence out of newsletters and this public repository. Use public event or registration pages; send private access details through the appropriate attendee channel. Share recordings and slides only with permission.

## 1. Event announcement

Use for a confirmed seminar, workshop or other event. Put the date, time, place and action near the title. Include attendance restrictions or registration requirements only as confirmed; omit unneeded fields.

```markdown
Subject: GBA-CCN | {Short event title} | {Day Month Year}
Preview text: {Speaker or organiser} · {Event date and time zone} · {Online or city}

# GBA-CCN Network Updates

**Event announcement · {Issue date}**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

Researchers and labs in the Greater Bay Area and worldwide are welcome.

## {Event title}

**{Speaker name}** · {Institution}  
**{Weekday, day month year} · {Start time and, if confirmed, end time} Hong Kong Time (UTC+8)**  
{Online platform, or venue and city}

{Two sentences: the question the event addresses, then what participants will hear or learn.}

[View event details]({Full public event-page URL})

{If registration is required: [Register]({Public registration URL}) by {confirmed deadline and time zone}.}
{If applicable: Attendance is {confirmed eligibility, capacity or fee information}.}
{If confirmed: Hosted by {lab or institution}.}

---
Have an event, opening or resource to share? [Contribute to the network](https://xbtinchina.github.io/Greater-bay-CCN-association/join/).

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)  
[Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

You are receiving GBA-CCN Network Updates because you subscribed. Forwarded this email? You are welcome to subscribe. You can unsubscribe or manage your subscription using the links below.
```

## 2. Weekly update

The default. Use one strong lead and short secondary items. One useful item is enough; never pad a quiet issue. For three or more items, add a single “In this issue” line. Remove any unused sections. An approaching deadline or important change can lead instead of an event.

```markdown
Subject: GBA-CCN | {Main item} + {Second item}
Preview text: {One sentence adding useful detail, such as the next event date or application deadline}

# GBA-CCN Network Updates

**Weekly update · {Day Month Year}**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

Researchers and labs in the Greater Bay Area and worldwide are welcome.

{Optional for three or more items: In this issue: {lead item} · {positions} · {network news or resources}.}

## {Main item: short, specific title}

**{Essential facts: speaker or organiser; confirmed date, time and time zone; location}**

{Two sentences explaining the item and why it is useful.}

[View event details]({Full public event-page URL})

## Opportunities

**{Role} — {Lab or institution}, {City}**  
{One sentence on the work and relevant background.}  
Apply by **{confirmed deadline}**.  
[View the position]({Full employer advert URL or network positions URL})

## Around the network

**{New lab, resource or network update}**  
{One or two sentences explaining what is new.}  
[Explore the update]({Full public URL})

---
Have an event, opening or resource to share? [Contribute to the network](https://xbtinchina.github.io/Greater-bay-CCN-association/join/).

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)  
[Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

You are receiving GBA-CCN Network Updates because you subscribed. Forwarded this email? You are welcome to subscribe. You can unsubscribe or manage your subscription using the links below.
```

## 3. Monthly summary

Optional. Replace that week's update with a useful overview. Lead with one outcome, new resource or development, then look ahead. Include only useful highlights; do not reproduce the month's weekly emails. Delete empty sections.

```markdown
Subject: GBA-CCN | {Month Year} | {Main highlight}
Preview text: {Main outcome} · {Next event or deadline} · {Useful resource or opening}

# GBA-CCN Network Updates

**Monthly summary · {Month Year}**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

Researchers and labs in the Greater Bay Area and worldwide are welcome.

In this issue: {main highlight} · {coming up} · {opportunities or resources}.

## This month's highlight

**{Outcome or development}**  
{Two sentences about what happened and what readers can now use or do.}  
[Read the update]({Full public URL})

## Coming up

**{Event title}** — {Day month year, time and time zone}  
{Speaker or organiser; one sentence about the topic.}  
[View event details]({Full public event-page URL})

## Resources to explore

**{Recording, tutorial or resource title}**  
{One sentence describing the material, its level or audience, and language if useful.}  
[Explore the resource]({Full public URL})

## Opportunities

**{Role} — {Lab or institution}, {City}**  
{One sentence about the role or an approaching deadline.}  
Apply by **{confirmed deadline}**.  
[View the position]({Full employer advert URL or network positions URL})

---
Have an event, opening or resource to share? [Contribute to the network](https://xbtinchina.github.io/Greater-bay-CCN-association/join/).

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)  
[Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

You are receiving GBA-CCN Network Updates because you subscribed. Forwarded this email? You are welcome to subscribe. You can unsubscribe or manage your subscription using the links below.
```

## 4. Position announcement

Usually include openings in the weekly update. Use a separate issue when timely notice is needed. Keep the summary short and link to the full advert rather than reproducing it. Confirm funding, eligibility and deadlines from the recruiting institution.

```markdown
Subject: GBA-CCN | {Role} at {Institution}
Preview text: {Research area} · {City} · Apply by {confirmed deadline}

# GBA-CCN Network Updates

**Position announcement · {Issue date}**  
Greater Bay Area Computational and Cognitive Neuroscience Network  
粤港澳大湾区计算神经科学与认知神经科学网络

Researchers and labs in the Greater Bay Area and worldwide are welcome.

## {Role or position title}

**{Lab or institution} · {City}**  
**Apply by {confirmed deadline}**

{Two sentences about the work and the research question or project.}

**Who should apply:** {One sentence with the essential qualifications from the employer's advert.}

{If confirmed and useful: Start date, duration and funding: {brief details}.}

[View the position and application instructions]({Full employer advert URL or network positions URL})

For questions about the role: {public recruitment contact}. Applications are handled by the recruiting institution.

---
Have an event, opening or resource to share? [Contribute to the network](https://xbtinchina.github.io/Greater-bay-CCN-association/join/).

[Website](https://xbtinchina.github.io/Greater-bay-CCN-association/) · [Events](https://xbtinchina.github.io/Greater-bay-CCN-association/events/) · [Positions](https://xbtinchina.github.io/Greater-bay-CCN-association/positions/) · [Resources](https://xbtinchina.github.io/Greater-bay-CCN-association/resources/)  
[Contact coordinators](https://xbtinchina.github.io/Greater-bay-CCN-association/about/) · [Subscribe](https://buttondown.com/gba-ccn)

You are receiving GBA-CCN Network Updates because you subscribed. Forwarded this email? You are welcome to subscribe. You can unsubscribe or manage your subscription using the links below.
```

## Before sending

Check for unfilled placeholders and empty sections; verify current dates, eligibility and deadlines; open the links; preview at a narrow width; and confirm the intended audience and automatic unsubscribe footer. After sending, use Buttondown's sent record as the history. Keep subscriber addresses and delivery reports out of the repository.

## Examples used to inform this revision

These are layout references, not sources for GBA-CCN announcements. Our wording and artwork are our own.

- [SNL, September 2025](https://www.neurolang.org/newsletters/SNL_September_2025.pdf): dated masthead, society news before grouped opportunities, clear submission route.
- [CNS newsletter](https://www.cogneurosociety.org/newsletter/): stable society, meeting and recruitment sections. Borrow the hierarchy while keeping our listings shorter.
- [SfN Nexus, issue displayed as 1 November 2024](https://www.sfn.org/publications/nexus-member-newsletter): linked headlines with short descriptions and concrete actions.
- [OHBMonthly, May 2024](https://humanbrainmapping.org/i4a/email/browserEmailMessage.cfm?bTest=1&campaignID=4085&contactID=%25%25contactID%25%25&recipID=%25%25recipID%25%25): contents and deadlines, short job summaries and an invitation to contribute.
