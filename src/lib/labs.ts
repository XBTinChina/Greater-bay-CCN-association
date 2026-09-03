import { getCollection, type CollectionEntry } from 'astro:content';

export type LabEntry = CollectionEntry<'labs'>;

export function labName(lab: LabEntry): string {
  return lab.data.lab ?? `${lab.data.pi} Lab`;
}

export function institutionShort(lab: LabEntry): string {
  return lab.data.institution_short ?? lab.data.institution;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

export async function publishedLabs(): Promise<LabEntry[]> {
  const labs = await getCollection('labs', (l) => !l.data.draft);
  return labs.sort((a, b) => a.data.pi.localeCompare(b.data.pi, 'en'));
}

export interface InstitutionSummary {
  name: string;
  short: string;
  city: string;
  count: number;
}

/** Institutions represented by the given labs, derived from data rather than declared. */
export function institutionsOf(labs: LabEntry[]): InstitutionSummary[] {
  const map = new Map<string, InstitutionSummary>();
  for (const lab of labs) {
    const key = lab.data.institution;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        name: lab.data.institution,
        short: institutionShort(lab),
        city: lab.data.city,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'));
}

export function keywordsOf(labs: LabEntry[]): string[] {
  const set = new Set<string>();
  for (const lab of labs) for (const k of lab.data.keywords) set.add(k.trim());
  return [...set].sort((a, b) => a.localeCompare(b, 'en'));
}
