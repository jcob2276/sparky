import type { Tables } from './database.types';

export type WikiSource = Pick<Tables<'vanguard_wiki_sources'>,
  'id' | 'source_table' | 'source_id' | 'source_date' | 'quote' | 'relevance'>;

function sourceTime(date: string | null): number {
  const time = date ? Date.parse(date) : NaN;
  return Number.isFinite(time) ? time : -Infinity;
}

export function sortWikiSources(sources: readonly WikiSource[]): WikiSource[] {
  return [...sources].sort((a, b) => b.relevance - a.relevance
    || sourceTime(b.source_date) - sourceTime(a.source_date)).slice(0, 8);
}

export function truncateWikiQuote(quote?: string | null): string {
  const characters = Array.from(quote ?? '');
  return characters.length > 160 ? `${characters.slice(0, 159).join('').trimEnd()}…` : (quote ?? '');
}
