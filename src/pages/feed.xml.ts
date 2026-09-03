import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { network } from '../lib/network';
import { url, absolute } from '../lib/url';
import { publishedEvents, formatWhen, speakerLine } from '../lib/events';
import { EVENT_TYPE_LABELS } from '../lib/taxonomy';

// News and events as one RSS feed, generated at build time.
export async function GET(_context: APIContext) {
  const news = await getCollection('news', (n) => !n.data.draft);
  const events = await publishedEvents();

  const items = [
    ...news.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      link: url(`news/#${n.id}`),
      description: n.body ?? '',
    })),
    ...events.map((e) => ({
      title: `${EVENT_TYPE_LABELS[e.data.type]}: ${e.data.title}`,
      pubDate: e.data.date,
      link: url(`events/${e.id}/`),
      description: [speakerLine(e), formatWhen(e), e.data.location].filter(Boolean).join(' · '),
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: network.short_name,
    description: network.tagline,
    // The channel link is the site's home, base path included; item links
    // are root-relative and resolve against the origin.
    site: absolute(''),
    items,
    trailingSlash: false,
  });
}
