import type { APIRoute } from 'astro';
import { network } from '../lib/network';
import { absolute } from '../lib/url';
import { publishedEvents, eventStart, eventEnd, ymd, speakerLine, byDateAsc } from '../lib/events';
import { EVENT_TYPE_LABELS } from '../lib/taxonomy';

// A static iCalendar feed of all published events. Subscribe once and every
// new talk appears in your calendar after the weekly rebuild.

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsDay(d: Date): string {
  return ymd(d).replace(/-/g, '');
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
  // RFC 5545: lines longer than 75 octets are folded with CRLF + space.
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let chunk = '';
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, 'utf8');
    if (size + len > (out.length === 0 ? 75 : 74)) {
      out.push(chunk);
      chunk = '';
      size = 0;
    }
    chunk += ch;
    size += len;
  }
  if (chunk) out.push(chunk);
  return out.join('\r\n ');
}

export const GET: APIRoute = async () => {
  const events = (await publishedEvents()).sort(byDateAsc);
  const host = new URL(absolute('')).host;
  const stamp = icsDate(new Date()); // build time; the feed is regenerated weekly
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${network.short_name}//Events//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(network.short_name)}`,
    `X-WR-CALDESC:${esc(network.tagline)}`,
    'X-WR-TIMEZONE:Asia/Hong_Kong',
  ];

  for (const e of events) {
    const d = e.data;
    const link = absolute(`events/${e.id}/`);
    const summaryParts = [EVENT_TYPE_LABELS[d.type], d.title];
    const speaker = speakerLine(e);
    const description = [speaker, d.location + (d.platform ? ` · ${d.platform}` : ''), link].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@${host}`);
    lines.push(`DTSTAMP:${stamp}`);
    if (d.start) {
      lines.push(`DTSTART:${icsDate(eventStart(e))}`);
      lines.push(`DTEND:${icsDate(eventEnd(e))}`);
    } else {
      // All-day events use exclusive DTEND (the day after the last day).
      const last = d.end_date ?? d.date;
      const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
      lines.push(`DTSTART;VALUE=DATE:${icsDay(d.date)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDay(next)}`);
    }
    lines.push(`SUMMARY:${esc(`${network.acronym} ${summaryParts.join(': ')}${speaker ? ` (${d.speaker})` : ''}`)}`);
    lines.push(`DESCRIPTION:${esc(description)}`);
    lines.push(`LOCATION:${esc(d.location + (d.platform ? ` (${d.platform})` : ''))}`);
    lines.push(`URL:${link}`);
    lines.push(`CATEGORIES:${esc(EVENT_TYPE_LABELS[d.type])}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  const body = lines.map(fold).join('\r\n') + '\r\n';
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="gba-ccn.ics"',
    },
  });
};
