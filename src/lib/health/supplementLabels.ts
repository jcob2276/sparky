import type { Supplement } from './supplementsClient';

const SHORT_BY_SLUG: Record<string, string> = {
  d3k2: 'D3',
  omega3: 'Omega',
  cynk: 'Cynk',
  kreatyna: 'Kreatyna',
  magnez: 'Magnez',
};

/** Krótka etykieta do chipów (D3, Omega, Cynk). Pełna nazwa i jednostki zostają na raporty. */
export function shortSupplementName(sup: Pick<Supplement, 'slug' | 'name'>): string {
  const known = SHORT_BY_SLUG[sup.slug];
  if (known) return known;
  const withoutParens = sup.name.replace(/\s*\(.*?\)/g, '');
  const firstPart = withoutParens.split(/\s+[+–-]\s+/)[0]?.trim() ?? '';
  return firstPart.split(/\s+/).slice(0, 2).join(' ') || sup.name;
}
