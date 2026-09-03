import { getCollection, type CollectionEntry } from 'astro:content';
import { TIME_ZONE, UTC_OFFSET } from './taxonomy';

export type EventEntry = CollectionEntry<'events'>;

/** YYYY-MM-DD of a date that was parsed from a plain calendar date (UTC midnight). */
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Instant at which the event starts, interpreted in Hong Kong time. */
export function eventStart(e: EventEntry): Date {
  const t = e.data.start ?? '00:00';
  return new Date(`${ymd(e.data.date)}T${t}:00${UTC_OFFSET}`);
}

/** Instant at which the event ends. Defaults: one hour after start, or end of the last day. */
export function eventEnd(e: EventEntry): Date {
  const lastDay = e.data.end_date ?? e.data.date;
  if (e.data.end) return new Date(`${ymd(lastDay)}T${e.data.end}:00${UTC_OFFSET}`);
  if (e.data.start && !e.data.end_date) return new Date(eventStart(e).getTime() + 60 * 60 * 1000);
  return new Date(`${ymd(lastDay)}T23:59:00${UTC_OFFSET}`);
}

export function isUpcoming(e: EventEntry, now: Date = new Date()): boolean {
  return eventEnd(e).getTime() >= now.getTime();
}

export function formatDate(d: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(d);
}

/** "Thu, 30 Oct 2026 · 16:00–17:00 HKT" */
export function formatWhen(e: EventEntry): string {
  const first = formatDate(e.data.date);
  const range = e.data.end_date ? `${first} to ${formatDate(e.data.end_date)}` : first;
  if (!e.data.start) return range;
  const time = e.data.end ? `${e.data.start}–${e.data.end}` : e.data.start;
  return `${range} · ${time} HKT`;
}

export function byDateAsc(a: EventEntry, b: EventEntry): number {
  return eventStart(a).getTime() - eventStart(b).getTime();
}
export function byDateDesc(a: EventEntry, b: EventEntry): number {
  return byDateAsc(b, a);
}

export async function publishedEvents(): Promise<EventEntry[]> {
  return getCollection('events', (e) => !e.data.draft);
}

export function speakerLine(e: EventEntry): string | undefined {
  if (!e.data.speaker) return undefined;
  const native = e.data.speaker_native ? ` ${e.data.speaker_native}` : '';
  const aff = e.data.speaker_affiliation ? `, ${e.data.speaker_affiliation}` : '';
  return `${e.data.speaker}${native}${aff}`;
}
