---
title: Privacy and consent
summary: What personal information the network publishes, where it is stored, and how to correct or remove it.
audience: public
order: 25
---

This page explains what personal information appears on this site, where it is kept, and how to change or remove it. The network is run by volunteer coordinators and is not a registered society, so this is a statement of practice, not a legal document. Membership rules are in the [charter](../charter/).

## What we publish and where it comes from

Every lab entry is submitted by the lab's principal investigator (PI), or with the PI's agreement, through the form on the [Join page](../../join/). The form has a required consent checkbox. An automated workflow turns the submission into a pull request; a coordinator reviews it; only after the merge does the entry appear on the site.

A lab entry can contain these fields and nothing else:

- `pi`: the PI's name in Latin script
- `pi_native`: the name in native script (optional)
- `lab`: the lab name
- `institution`, `institution_short`, `department` (optional)
- `city`
- `tier`: member or affiliate
- `website`
- `email` (optional; public if given)
- `scholar`: Google Scholar link
- `github`: GitHub link
- `photo`
- `keywords`: one to eight research topics
- `description`: short lab text
- `looking_for`: who the lab seeks (optional)
- `joined`: the date the entry was approved

The schema requires only name, institution, city, keywords and joining date; the form also asks for a short description. Leave any other field blank if you do not want it published.

## Where the data is stored

Everything on this site is a file in a public GitHub repository, served by GitHub Pages. Both are hosted outside mainland China, and anyone can read, copy and fork the repository. Publishing a lab entry is therefore a voluntary, consent-based publication of professional information to a worldwide audience.

Hong Kong's Personal Data (Privacy) Ordinance requires that personal data be collected fairly, for a stated purpose, and used only for that purpose; the consent checkbox and this page serve that. The mainland Personal Information Protection Law treats sending personal information outside the mainland as needing the individual's separate consent and, in some settings, institutional approval. This page is not legal advice. PIs at mainland institutions may want to check their institution's rules on publishing staff profiles abroad before submitting.

## Photos

Photos are optional. Before publication a photo is resized to 400 by 400 pixels, converted to WebP, and stripped of all metadata, including EXIF location. Like the rest of the site, photos are published under CC BY 4.0, so submit only a photo you may share under that licence.

## Correcting or removing an entry

You can change or remove your entry at any time, without giving a reason:

- open a pull request that edits or deletes your lab's file;
- open an issue in the repository asking for the change;
- write to the contact address on the [About page](../../about/).

Coordinators act on removal requests within a reasonable time. Two limits apply. Git history, forks and public mirrors may keep earlier versions of a file after it leaves the live site. And because content is published under CC BY 4.0, copies made while the entry was public remain lawful; removal stops the network distributing the entry but does not recall existing copies.

## Speakers and recordings

Event pages list a speaker's name, affiliation and link, supplied by the speaker or host. Talks are recorded only with the speaker's written consent, obtained by the host before the talk. Recordings go to Bilibili and YouTube and are linked from the event page. A speaker can withdraw consent at any time by writing to the host or the contact address, and the recording will be taken down from the network's channels. The same limits on existing copies apply.

## Speaker nominations

Nominations are GitHub issues in the network's repository. They are not published on the site and coordinators handle them discreetly, but the repository is public, so an issue there can be read by anyone who goes looking. Write only what you would be comfortable with the nominee reading. The coordinators may move the queue to a private tracker.

## Cookies, analytics and fonts

The site sets no cookies, runs no analytics and loads no fonts or scripts from third parties. GitHub, as host, keeps its own server logs under its privacy statement; the network does not see them.

## Contact

Questions go to the contact address on the [About page](../../about/), or open an issue in the repository. This page changes by pull request, so its history is open to anyone.
